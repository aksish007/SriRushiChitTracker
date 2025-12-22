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

    const users = await prisma.user.findMany({
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