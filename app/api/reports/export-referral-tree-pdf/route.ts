import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { generateReferralTreeReport } from '@/lib/pdf-generator';
import { PayoutCalculator } from '@/lib/payout-calculator';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Function to calculate actual referral counts by step
async function calculateActualReferralCountsByStep(userId: string, maxSteps: number = 100): Promise<number[]> {
  const counts: number[] = [];
  let currentLevelUsers = [userId];
  
  for (let step = 1; step <= maxSteps; step++) {
    const nextLevelUsers = await prisma.user.findMany({
      where: {
        referredBy: {
          in: currentLevelUsers,
        },
      },
      select: {
        id: true,
      },
    });
    
    const count = nextLevelUsers.length;
    counts.push(count);
    
    if (count === 0) {
      break;
    }
    
    currentLevelUsers = nextLevelUsers.map(user => user.id);
  }
  
  return counts;
}

// Determine club tier and base rate from chit amount
function getClubTierAndRate(chitAmount: number): { tier: string; rate: number } {
  if (chitAmount >= 1000000) {
    return { tier: 'DIAMOND', rate: 1000 };
  } else if (chitAmount >= 500000) {
    return { tier: 'CHAIRMAN', rate: 500 };
  } else if (chitAmount >= 300000) {
    return { tier: 'REGIONAL', rate: 300 };
  } else if (chitAmount >= 200000) {
    return { tier: 'MANAGER', rate: 200 };
  } else if (chitAmount >= 100000) {
    return { tier: 'DEVELOPMENT', rate: 100 };
  } else if (chitAmount >= 50000) {
    return { tier: 'EXECUTIVE', rate: 50 };
  }
  return { tier: 'EXECUTIVE', rate: 50 };
}

export async function GET(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const currentUser = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get('registrationId');

    if (!registrationId) {
      return NextResponse.json(
        { error: 'Registration ID is required' },
        { status: 400 }
      );
    }

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { registrationId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: {
            chitScheme: true,
          },
        },
        referrer: {
          select: {
            firstName: true,
            lastName: true,
            registrationId: true,
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

    // Check permissions
    if (currentUser.role !== 'ADMIN' && currentUser.id !== targetUser.id) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Build referral tree by steps
    const steps: Array<{
      step: number;
      referrals: Array<{
        name: string;
        registrationId: string;
        chitSchemes: Array<{ name: string; chitId: string; amount: number }>;
        referredBy: string;
        incentiveAmount: number;
      }>;
    }> = [];

    let currentLevelUsers = [{ id: targetUser.id, registrationId: targetUser.registrationId }];
    let step = 1;

    while (currentLevelUsers.length > 0 && step <= 10) {
      const nextLevelUsers = await prisma.user.findMany({
        where: {
          referredBy: {
            in: currentLevelUsers.map(u => u.id),
          },
        },
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
            include: {
              chitScheme: true,
            },
          },
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

      const stepReferrals = await Promise.all(
        nextLevelUsers.map(async (user) => {
          // Calculate incentive for this user based on their chit schemes
          let totalIncentive = 0;

          for (const subscription of user.subscriptions) {
            const chitAmount = Number(subscription.chitScheme.amount);
            const { rate } = getClubTierAndRate(chitAmount);
            
            // Calculate actual referral counts
            const actualCounts = await calculateActualReferralCountsByStep(user.id, 5);
            if (actualCounts.length > 0) {
              const payoutResult = PayoutCalculator.calculatePayoutWithActualCounts(rate, actualCounts);
              // Sum incentives from all steps
              totalIncentive += payoutResult.steps.reduce((sum, s) => sum + s.stepPayout, 0);
            }
          }

          return {
            name: `${user.firstName} ${user.lastName}`,
            registrationId: user.registrationId,
            chitSchemes: user.subscriptions.map(sub => ({
              name: sub.chitScheme.name,
              chitId: sub.chitScheme.chitId,
              amount: Number(sub.chitScheme.amount),
            })),
            referredBy: user.referrer 
              ? `${user.referrer.firstName} ${user.referrer.lastName} (${user.referrer.registrationId})`
              : 'N/A',
            incentiveAmount: totalIncentive,
          };
        })
      );

      steps.push({
        step,
        referrals: stepReferrals,
      });

      currentLevelUsers = nextLevelUsers.map(u => ({ id: u.id, registrationId: u.registrationId }));
      step++;
    }

    // Generate PDF
    const pdfBuffer = generateReferralTreeReport({
      rootUser: {
        name: `${targetUser.firstName} ${targetUser.lastName}`,
        registrationId: targetUser.registrationId,
      },
      steps,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'EXPORT_REFERRAL_TREE_PDF',
        details: `Exported referral tree PDF for ${targetUser.registrationId}`,
        ipAddress,
        userAgent,
      },
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="referral-tree-${targetUser.registrationId}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error: any) {
    logger.error('Export referral tree PDF error', error instanceof Error ? error : new Error(String(error)), {
      action: 'EXPORT_REFERRAL_TREE_PDF_ERROR',
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/reports/export-referral-tree-pdf',
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

