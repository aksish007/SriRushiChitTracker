import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { exportSubscriptionsToExcel } from '@/lib/excel-utils';
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

    // Build where clause based on filters
    const where: any = {};

    if (!allTillDate) {
      if (month && year) {
        // Filter by month and year - need to check subscription creation date
        const start = new Date(parseInt(year), parseInt(month) - 1, 1);
        const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
        where.createdAt = {
          gte: start,
          lte: end,
        };
      } else if (startDate && endDate) {
        // Filter by date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt = {
          gte: start,
          lte: end,
        };
      }
      // If no filters provided, show all (existing behavior)
    }
    // If allTillDate is true, no filters applied (show all)

    // Fetch subscriptions with related data
    const subscriptions = await prisma.chitSubscription.findMany({
      where,
      include: {
        user: {
          select: {
            registrationId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        chitScheme: {
          select: {
            chitId: true,
            name: true,
            amount: true,
            duration: true,
            totalSlots: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'EXPORT_SUBSCRIPTIONS_REPORT',
        details: `Exported ${subscriptions.length} subscriptions`,
        ipAddress,
        userAgent,
      },
    });

    // Generate Excel file
    const excelBuffer = exportSubscriptionsToExcel(subscriptions);

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="subscriptions-report-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });

  } catch (error: any) {
    logger.error('Export subscriptions report error', error instanceof Error ? error : new Error(String(error)), {
      action: 'EXPORT_SUBSCRIPTIONS_REPORT_ERROR',
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/reports/export-subscriptions',
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
