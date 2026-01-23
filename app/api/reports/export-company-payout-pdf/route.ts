import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { generateCompanyPayoutReport } from '@/lib/pdf-generator';
import logger from '@/lib/logger';
import { COMPANY_NAME, COMPANY_ADDRESS, ORGANIZATION_REGISTRATION_ID } from '@/lib/constants';

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

    // Fetch actual payouts for the specified month/year (excluding organization user)
    const payouts = await prisma.payout.findMany({
      where: {
        month,
        year,
        user: {
          registrationId: {
            not: ORGANIZATION_REGISTRATION_ID,
          },
        },
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

    // Format payouts as individual rows (matching sample format)
    // Each payout is a separate row in the report
    const payoutRows = payouts.map((payout, index) => {
      const referrerIdentifier = payout.user.referrer
        ? `${payout.user.referrer.firstName} ${payout.user.referrer.lastName} (${payout.user.referrer.registrationId})`
        : '';
      
      return {
        serialNumber: index + 1,
        registrationId: payout.user.registrationId,
        name: `${payout.user.firstName} ${payout.user.lastName}`,
        subscriberId: payout.subscription.subscriberId,
        chitSchemeName: payout.subscription.chitScheme.name,
        amount: Number(payout.amount),
        referrerIdentifier,
      };
    });

    // Generate PDF
    const pdfBuffer = generateCompanyPayoutReport({
      month,
      year,
      payoutRows,
      companyName: COMPANY_NAME,
      companyAddress: COMPANY_ADDRESS,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'EXPORT_COMPANY_PAYOUT_PDF',
        details: `Exported company payout PDF for ${month}/${year} - ${payoutRows.length} payout records`,
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

