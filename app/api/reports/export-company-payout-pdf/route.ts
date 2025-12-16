import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { generateCompanyPayoutReport } from '@/lib/pdf-generator';
import logger from '@/lib/logger';
import { COMPANY_NAME } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const adminUser = await requireAuth(request, 'ADMIN');
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || '0');
    const year = parseInt(searchParams.get('year') || '0');

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year are required' },
        { status: 400 }
      );
    }

    // Fetch actual payouts for the specified month/year
    const payouts = await prisma.payout.findMany({
      where: {
        month,
        year,
      },
      include: {
        user: {
          select: {
            id: true,
            registrationId: true,
            firstName: true,
            lastName: true,
            referrer: {
              select: {
                firstName: true,
                lastName: true,
                registrationId: true,
              },
            },
          },
        },
        subscription: {
          include: {
            chitScheme: {
              select: {
                id: true,
                chitId: true,
                name: true,
                amount: true,
              },
            },
          },
        },
      },
      orderBy: {
        user: {
          registrationId: 'asc',
        },
      },
    });

    // Group payouts by user and aggregate data
    const userPayoutMap = new Map<string, {
      user: typeof payouts[0]['user'];
      chitValues: Array<{ value: number; subscriberId?: string }>;
      referrerIdentifier: string;
      totalIncentive: number;
    }>();

    payouts.forEach((payout) => {
      const userId = payout.userId;
      const chitAmount = Number(payout.subscription.chitScheme.amount);
      
      if (!userPayoutMap.has(userId)) {
        userPayoutMap.set(userId, {
          user: payout.user,
          chitValues: [],
          referrerIdentifier: payout.user.referrer
            ? `${payout.user.referrer.firstName} ${payout.user.referrer.lastName} (${payout.user.referrer.registrationId})`
            : '',
          totalIncentive: 0,
        });
      }

      const userData = userPayoutMap.get(userId)!;
      
      // Add chit value if not already present
      const chitValueExists = userData.chitValues.some(
        cv => cv.value === chitAmount
      );
      if (!chitValueExists) {
        userData.chitValues.push({
          value: chitAmount,
          subscriberId: payout.subscription.subscriberId,
        });
      }
      
      // Add payout amount to total incentive
      userData.totalIncentive += Number(payout.amount);
    });

    // Convert map to array and format for PDF
    const userData = Array.from(userPayoutMap.values()).map((data, index) => ({
      index: index + 1,
      name: `${data.user.firstName} ${data.user.lastName}`,
      registrationId: data.user.registrationId,
      chitValues: data.chitValues,
      referrerIdentifier: data.referrerIdentifier,
      totalIncentive: data.totalIncentive,
    }));

    // Generate PDF
    const pdfBuffer = generateCompanyPayoutReport({
      month,
      year,
      users: userData,
      companyName: COMPANY_NAME,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'EXPORT_COMPANY_PAYOUT_PDF',
        details: `Exported company payout PDF for ${month}/${year} - ${userData.length} users`,
        ipAddress,
        userAgent,
      },
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="company-payout-${year}-${month.toString().padStart(2, '0')}.pdf"`,
      },
    });

  } catch (error: any) {
    logger.error('Export company payout PDF error', error instanceof Error ? error : new Error(String(error)), {
      action: 'EXPORT_COMPANY_PAYOUT_PDF_ERROR',
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/reports/export-company-payout-pdf',
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

