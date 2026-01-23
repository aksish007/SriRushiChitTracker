import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { exportUsersToExcel } from '@/lib/excel-utils';
import logger from '@/lib/logger';

// Force dynamic rendering for this API route
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
        // Filter by month and year
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

    const users = await prisma.user.findMany({
      where,
      select: {
        registrationId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        isActive: true,
        createdAt: true,
        referrer: {
          select: {
            registrationId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const excelBuffer = exportUsersToExcel(users);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'EXPORT_USERS',
        details: `Exported ${users.length} users to Excel`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error: any) {
    logger.error('Export users error', error instanceof Error ? error : new Error(String(error)), {
      action: 'EXPORT_USERS_ERROR',
      userId: adminUser?.id,
      registrationId: adminUser?.registrationId,
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/reports/export-users',
        method: 'GET',
        errorMessage: error.message
      }
    });
    
    if (error.message === 'Authentication required' || error.message === 'Insufficient permissions') {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}