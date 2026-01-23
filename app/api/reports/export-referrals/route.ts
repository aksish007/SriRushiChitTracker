import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { exportReferralsToExcel } from '@/lib/excel-utils';
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

    // Build where clause based on filters
    const where: any = {};

    if (!allTillDate && startDate && endDate) {
      // Filter by date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = {
        gte: start,
        lte: end,
      };
    }
    // If allTillDate is true or no dates provided, show all

    // Fetch users with referral data
    const users = await prisma.user.findMany({
      where,
      include: {
        referrer: {
          select: {
            registrationId: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        referrals: {
          select: {
            registrationId: true,
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true,
          },
        },
        subscriptions: {
          include: {
            chitScheme: {
              select: {
                name: true,
                amount: true,
              },
            },
          },
        },
        payouts: {
          select: {
            amount: true,
            status: true,
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
        action: 'EXPORT_REFERRALS_REPORT',
        details: `Exported ${users.length} users with referral data`,
        ipAddress,
        userAgent,
      },
    });

    // Generate Excel file
    const excelBuffer = exportReferralsToExcel(users);

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="referrals-report-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });

  } catch (error: any) {
    logger.error('Export referrals report error', error instanceof Error ? error : new Error(String(error)), {
      action: 'EXPORT_REFERRALS_REPORT_ERROR',
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/reports/export-referrals',
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
