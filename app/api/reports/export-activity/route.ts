import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { exportActivityToExcel } from '@/lib/excel-utils';
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

    // Fetch audit logs with user data
    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            registrationId: true,
            firstName: true,
            lastName: true,
            email: true,
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
        action: 'EXPORT_ACTIVITY_REPORT',
        details: `Exported ${auditLogs.length} activity logs`,
        ipAddress,
        userAgent,
      },
    });

    // Generate Excel file
    const excelBuffer = exportActivityToExcel(auditLogs);

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="activity-report-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });

  } catch (error: any) {
    logger.error('Export activity report error', error instanceof Error ? error : new Error(String(error)), {
      action: 'EXPORT_ACTIVITY_REPORT_ERROR',
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/reports/export-activity',
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
