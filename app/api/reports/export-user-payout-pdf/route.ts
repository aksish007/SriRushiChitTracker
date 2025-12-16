import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { generateUserPayoutReport } from '@/lib/pdf-generator';
import logger from '@/lib/logger';
import { COMPANY_NAME } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const currentUser = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || searchParams.get('registrationId');
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID or Registration ID is required' },
        { status: 400 }
      );
    }

    // Calculate date range - all data from beginning if month/year not provided
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    let reportMonth: number;
    let reportYear: number;
    let filterByDate = false;

    if (monthParam && yearParam) {
      // Use provided month/year
      reportMonth = parseInt(monthParam);
      reportYear = parseInt(yearParam);
      filterByDate = true;
    } else {
      // Use current month/year for report title, but include all data
      reportMonth = currentMonth;
      reportYear = currentYear;
      filterByDate = false;
    }

    // Find the target user
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { registrationId: userId }
        ]
      },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: {
            chitScheme: true,
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check permissions - admin can view any user, regular users can only view themselves
    if (currentUser.role !== 'ADMIN' && currentUser.id !== targetUser.id) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Debug: Check if user has referrals
    const directReferralCount = await prisma.user.count({
      where: { referredBy: targetUser.id },
    });
    console.log('Target user:', {
      id: targetUser.id,
      registrationId: targetUser.registrationId,
      directReferralCount,
    });

    // Get root user's own payouts and subscriptions
    const rootUserPayoutWhere: any = {
      userId: targetUser.id,
    };
    if (filterByDate) {
      rootUserPayoutWhere.month = reportMonth;
      rootUserPayoutWhere.year = reportYear;
    }

    const rootUserPayouts = await prisma.payout.findMany({
      where: rootUserPayoutWhere,
      include: {
        subscription: {
          include: {
            chitScheme: {
              select: {
                amount: true,
              },
            },
          },
        },
      },
    });

    const rootUserSubscriptions = await prisma.chitSubscription.findMany({
      where: {
        userId: targetUser.id,
        status: 'ACTIVE',
      },
      include: {
        chitScheme: {
          select: {
            amount: true,
          },
        },
      },
    });

    // Calculate root user's chit value and total incentive
    let rootChitValue = 0;
    let rootTotalIncentive = 0;

    rootUserPayouts.forEach((payout) => {
      const chitAmount = Number(payout.subscription.chitScheme.amount);
      rootTotalIncentive += Number(payout.amount);
      if (chitAmount > rootChitValue) {
        rootChitValue = chitAmount;
      }
    });

    if (rootChitValue === 0 && rootUserSubscriptions.length > 0) {
      rootUserSubscriptions.forEach((sub) => {
        const chitAmount = Number(sub.chitScheme.amount);
        if (chitAmount > rootChitValue) {
          rootChitValue = chitAmount;
        }
      });
    }

    // Get root user's referrer info
    const rootUserWithReferrer = await prisma.user.findUnique({
      where: { id: targetUser.id },
      include: {
        referrer: {
          select: {
            firstName: true,
            lastName: true,
            registrationId: true,
          },
        },
      },
    });

    // Build referral tree by steps using actual payouts for the month/year
    const steps: Array<{
      step: number;
      referrals: Array<{
        name: string;
        registrationId: string;
        chitValue: number;
        incentiveAmount: number;
        referrerName: string;
        referrerRegistrationId: string;
      }>;
    }> = [];

    // Add root user's own data as Step 0
    if (rootChitValue > 0 || rootTotalIncentive > 0) {
      steps.push({
        step: 0,
        referrals: [{
          name: `${targetUser.firstName} ${targetUser.lastName}`,
          registrationId: targetUser.registrationId,
          chitValue: rootChitValue,
          incentiveAmount: rootTotalIncentive,
          referrerName: rootUserWithReferrer?.referrer 
            ? `${rootUserWithReferrer.referrer.firstName} ${rootUserWithReferrer.referrer.lastName}`
            : '',
          referrerRegistrationId: rootUserWithReferrer?.referrer?.registrationId || '',
        }],
      });
    }

    let currentLevelUsers: Array<{ id: string; registrationId: string; firstName: string; lastName: string }> = [
      { 
        id: targetUser.id, 
        registrationId: targetUser.registrationId,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName
      }
    ];
    let step = 1;

    while (currentLevelUsers.length > 0 && step <= 10) {
      const nextLevelUsers = await prisma.user.findMany({
        where: {
          referredBy: {
            in: currentLevelUsers.map(u => u.id),
          },
        },
        include: {
          referrer: {
            select: {
              firstName: true,
              lastName: true,
              registrationId: true,
            },
          },
        },
      });

      if (nextLevelUsers.length === 0) {
        break;
      }

      // Get actual payouts for these users (all data or specific month/year)
      const userIds = nextLevelUsers.map(u => u.id);
      
      // Build payout filter - only filter by date if explicitly provided
      const payoutWhere: any = {
        userId: { in: userIds },
      };

      // Only add month/year filter if explicitly provided in query params
      if (filterByDate) {
        // Specific month/year
        payoutWhere.month = reportMonth;
        payoutWhere.year = reportYear;
      }
      // If not filtering by date, include all payouts (no month/year filter)

      // Debug: Log the query to verify no date filter is applied
      console.log('User payout PDF query:', {
        userIdsCount: userIds.length,
        filterByDate,
        monthParam,
        yearParam,
        hasMonthFilter: 'month' in payoutWhere,
        hasYearFilter: 'year' in payoutWhere,
      });

      const payouts = await prisma.payout.findMany({
        where: payoutWhere,
        include: {
          subscription: {
            include: {
              chitScheme: {
                select: {
                  amount: true,
                },
              },
            },
          },
        },
      });

      // Get subscriptions for these users to get chit values
      const subscriptions = await prisma.chitSubscription.findMany({
        where: {
          userId: { in: userIds },
          status: 'ACTIVE',
        },
        include: {
          chitScheme: {
            select: {
              amount: true,
            },
          },
        },
      });

      // Group payouts by user
      const userPayoutMap = new Map<string, {
        chitValue: number;
        totalIncentive: number;
      }>();

      payouts.forEach((payout) => {
        const userId = payout.userId;
        const chitAmount = Number(payout.subscription.chitScheme.amount);
        
        if (!userPayoutMap.has(userId)) {
          userPayoutMap.set(userId, {
            chitValue: chitAmount,
            totalIncentive: 0,
          });
        }

        const userData = userPayoutMap.get(userId)!;
        userData.totalIncentive += Number(payout.amount);
        // Use the largest chit value if multiple
        if (chitAmount > userData.chitValue) {
          userData.chitValue = chitAmount;
        }
      });

      // Group subscriptions by user to get chit values for users without payouts
      const userSubscriptionMap = new Map<string, number>();
      subscriptions.forEach((sub) => {
        const userId = sub.userId;
        const chitAmount = Number(sub.chitScheme.amount);
        if (!userSubscriptionMap.has(userId) || chitAmount > userSubscriptionMap.get(userId)!) {
          userSubscriptionMap.set(userId, chitAmount);
        }
      });

      // Build step referrals - show all referrals, use payouts when available
      // Create a map of current level users for quick lookup
      const currentLevelUserMap = new Map(currentLevelUsers.map(u => [u.id, u]));
      
      const stepReferrals = nextLevelUsers.map((user) => {
        const payoutData = userPayoutMap.get(user.id);
        const chitValue = payoutData?.chitValue || userSubscriptionMap.get(user.id) || 0;
        const incentiveAmount = payoutData?.totalIncentive || 0;

        // Find who referred this user in the current step (parent in the tree)
        // The referrer should be one of the current level users
        let referrerName = '';
        let referrerRegistrationId = '';
        
        if (user.referredBy) {
          const parentUser = currentLevelUserMap.get(user.referredBy);
          if (parentUser) {
            referrerName = `${parentUser.firstName} ${parentUser.lastName}`;
            referrerRegistrationId = parentUser.registrationId;
          } else if (user.referrer) {
            referrerName = `${user.referrer.firstName} ${user.referrer.lastName}`;
            referrerRegistrationId = user.referrer.registrationId;
          }
        }

        return {
          name: `${user.firstName} ${user.lastName}`,
          registrationId: user.registrationId,
          chitValue,
          incentiveAmount,
          referrerName,
          referrerRegistrationId,
        };
      }); // Show all referrals, even if they don't have subscriptions yet

      console.log(`Step ${step}: Found ${nextLevelUsers.length} users, ${stepReferrals.length} referrals with data`);

      if (stepReferrals.length > 0) {
        steps.push({
          step,
          referrals: stepReferrals,
        });
      }

      currentLevelUsers = nextLevelUsers.map(u => ({ 
        id: u.id, 
        registrationId: u.registrationId,
        firstName: u.firstName,
        lastName: u.lastName
      }));
      step++;
    }

    // Generate PDF - only pass month/year if filtering by date
    const pdfBuffer = generateUserPayoutReport({
      userName: `${targetUser.firstName} ${targetUser.lastName}`,
      registrationId: targetUser.registrationId,
      ...(filterByDate ? { month: reportMonth, year: reportYear } : {}),
      steps,
      companyName: COMPANY_NAME,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'EXPORT_USER_PAYOUT_PDF',
        details: `Exported user payout PDF for ${targetUser.registrationId} - ${monthParam && yearParam ? `${reportMonth}/${reportYear}` : 'All data'}`,
        ipAddress,
        userAgent,
      },
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="user-payout-${targetUser.registrationId}-${monthParam && yearParam ? `${reportYear}-${reportMonth.toString().padStart(2, '0')}` : 'all-data'}.pdf"`,
      },
    });

  } catch (error: any) {
    logger.error('Export user payout PDF error', error instanceof Error ? error : new Error(String(error)), {
      action: 'EXPORT_USER_PAYOUT_PDF_ERROR',
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/reports/export-user-payout-pdf',
        method: 'GET',
        errorMessage: error.message
      }
    });
    
    if (error.message === 'Authentication required' || error.message === 'Insufficient permissions') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

