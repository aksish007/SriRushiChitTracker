import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verifyToken } from '@/lib/auth';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Invalid user IDs' }, { status: 400 });
    }

    // Check if any users have active subscriptions
    const usersWithActiveSubscriptions = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        subscriptions: {
          some: {
            status: 'ACTIVE',
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (usersWithActiveSubscriptions.length > 0) {
      const userNames = usersWithActiveSubscriptions
        .map(user => `${user.firstName} ${user.lastName}`)
        .join(', ');
      return NextResponse.json({ 
        error: `Cannot delete users with active subscriptions: ${userNames}` 
      }, { status: 400 });
    }

    // Delete users using transaction to handle referral relationships
    const deletedUsers = await prisma.$transaction(async (tx) => {
      // 1. Update all users who were referred by any of the users being deleted
      await tx.user.updateMany({
        where: { 
          referredBy: { in: userIds }
        },
        data: { referredBy: null }
      });

      // 2. Delete payouts for all users
      await tx.payout.deleteMany({
        where: { userId: { in: userIds } }
      });

      // 3. Delete subscriptions for all users
      await tx.chitSubscription.deleteMany({
        where: { userId: { in: userIds } }
      });

      // 4. Delete nominees for all users (has CASCADE delete)
      await tx.nominee.deleteMany({
        where: { userId: { in: userIds } }
      });

      // 5. Delete existing audit logs for all users being deleted
      await tx.auditLog.deleteMany({
        where: { userId: { in: userIds } }
      });

      // 6. Create audit log for the bulk deletion action
      // Check if admin is deleting themselves
      const isSelfDeletion = userIds.includes(adminUser.id);
      await tx.auditLog.create({
        data: {
          userId: isSelfDeletion ? null : adminUser.id,
          action: 'USERS_BULK_DELETE',
          details: `Bulk deleted ${userIds.length} users${isSelfDeletion ? ' (including self)' : ''}`,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      });

      // 7. Finally delete the users
      return await tx.user.deleteMany({
        where: {
          id: { in: userIds },
        },
      });
    });

    return NextResponse.json({ 
      message: `${deletedUsers.count} users deleted successfully` 
    });
  } catch (error: any) {
    logger.error('Error bulk deleting users', error instanceof Error ? error : new Error(String(error)), {
      action: 'USERS_BULK_DELETE_ERROR',
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/users/bulk-delete',
        method: 'DELETE',
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });
    
    // Handle specific Prisma errors
    if (error.code === 'P2003') {
      return NextResponse.json({ 
        error: 'Cannot delete users due to existing relationships. Please contact support.' 
      }, { status: 400 });
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        error: 'One or more users not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
