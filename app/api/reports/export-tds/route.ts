import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { exportTdsToExcel } from '@/lib/excel-utils';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const adminUser = await requireAuth(request, 'ADMIN');
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const allTillDate = searchParams.get('allTillDate') === 'true';

    // Build where clause
    const where: any = {};

    if (!allTillDate) {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'Start date and end date are required, or select "All till date"' },
          { status: 400 }
        );
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include entire end date

      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        );
      }

      if (start > end) {
        return NextResponse.json(
          { error: 'Start date must be before or equal to end date' },
          { status: 400 }
        );
      }

      where.createdAt = {
        gte: start,
        lte: end,
      };
    }
    // If allTillDate is true, no date filter applied

    // Fetch payouts within the date range (or all if allTillDate)
    // Using createdAt for date filtering (can be changed to paidAt if needed)
    const payouts = await prisma.payout.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            registrationId: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        subscription: {
          include: {
            chitScheme: {
              select: {
                id: true,
                chitId: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Create audit log
    const dateRange = allTillDate ? 'all till date' : `${startDate} to ${endDate}`;
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'EXPORT_TDS_REPORT',
        details: `Exported TDS report from ${dateRange} - ${payouts.length} payout records`,
        ipAddress,
        userAgent,
      },
    });

    // Generate Excel file
    const excelBuffer = exportTdsToExcel(payouts);

    const filename = allTillDate ? 'tds-report-all-till-date.xlsx' : `tds-report-${startDate}-to-${endDate}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    logger.error('Export TDS report error', error instanceof Error ? error : new Error(String(error)), {
      action: 'EXPORT_TDS_REPORT_ERROR',
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/reports/export-tds',
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

