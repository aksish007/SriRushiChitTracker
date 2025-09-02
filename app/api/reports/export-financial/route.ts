import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { exportFinancialToExcel } from '@/lib/excel-utils';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const adminUser = await requireAuth(request, 'ADMIN');

    // Fetch financial data
    const [subscriptions, payouts, chitSchemes] = await Promise.all([
      prisma.chitSubscription.findMany({
        include: {
          user: {
            select: {
              registrationId: true,
              firstName: true,
              lastName: true,
            },
          },
          chitScheme: {
            select: {
              chitId: true,
              name: true,
              amount: true,
              duration: true,
            },
          },
        },
        where: {
          status: 'ACTIVE',
        },
      }),
      prisma.payout.findMany({
        include: {
          subscription: {
            include: {
              user: {
                select: {
                  registrationId: true,
                  firstName: true,
                  lastName: true,
                },
              },
              chitScheme: {
                select: {
                  chitId: true,
                  name: true,
                  amount: true,
                },
              },
            },
          },
        },
      }),
      prisma.chitScheme.findMany({
        where: {
          isActive: true,
        },
      }),
    ]);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'EXPORT_FINANCIAL_REPORT',
        details: `Exported financial data: ${subscriptions.length} subscriptions, ${payouts.length} payouts, ${chitSchemes.length} schemes`,
        ipAddress,
        userAgent,
      },
    });

    // Generate Excel file
    const excelBuffer = exportFinancialToExcel({
      subscriptions,
      payouts,
      chitSchemes,
    });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="financial-report-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });

  } catch (error: any) {
    logger.error('Export financial report error', error instanceof Error ? error : new Error(String(error)), {
      action: 'EXPORT_FINANCIAL_REPORT_ERROR',
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/reports/export-financial',
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
