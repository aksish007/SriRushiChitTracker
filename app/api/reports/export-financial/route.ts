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
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const allTillDate = searchParams.get('allTillDate') === 'true';

    // Build where clauses based on filters
    const subscriptionWhere: any = { status: 'ACTIVE' };
    const payoutWhere: any = {};

    if (!allTillDate) {
      if (month && year) {
        // Filter by month and year
        const start = new Date(parseInt(year), parseInt(month) - 1, 1);
        const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
        subscriptionWhere.createdAt = {
          gte: start,
          lte: end,
        };
        payoutWhere.month = parseInt(month);
        payoutWhere.year = parseInt(year);
      } else if (startDate && endDate) {
        // Filter by date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        subscriptionWhere.createdAt = {
          gte: start,
          lte: end,
        };
        payoutWhere.createdAt = {
          gte: start,
          lte: end,
        };
      }
      // If no filters provided, show all (existing behavior)
    }
    // If allTillDate is true, no filters applied (show all)

    // Fetch financial data
    const [subscriptions, payouts, chitSchemes] = await Promise.all([
      prisma.chitSubscription.findMany({
        where: subscriptionWhere,
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
      }),
      prisma.payout.findMany({
        where: payoutWhere,
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
        details: `Exported financial data: ${subscriptions.length} subscriptions, ${payouts.length} payouts, ${chitSchemes.length} groups`,
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
