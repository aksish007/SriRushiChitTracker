import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { UserDeletionService } from '@/lib/user-deletion-strategy';
import logger from '@/lib/logger';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  let adminUser: any = null;

  try {
    // Require admin authentication
    adminUser = await requireAuth(request, 'ADMIN');

    const { id } = await params;
    const body = await request.json();
    const { 
      deletionType = 'soft', // 'soft' or 'hard'
      reason = '',
      forceDelete = false 
    } = body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, isActive: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'User is already deleted' },
        { status: 400 }
      );
    }

    // Get deletion analysis
    const deletionCheck = await UserDeletionService.checkUserDeletion(id);

    if (deletionType === 'soft') {
      // Soft delete - always allowed
      await UserDeletionService.softDeleteUser({
        userId: id,
        deletedBy: adminUser.id,
        reason,
      });

      logger.info('User soft deleted', {
        action: 'USER_SOFT_DELETE',
        userId: adminUser.id,
        deletedUserId: id,
        reason,
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        message: 'User soft deleted successfully',
        deletionType: 'soft',
        warnings: deletionCheck.warnings,
      });

    } else if (deletionType === 'hard') {
      // Hard delete - requires safety checks
      if (!forceDelete && !deletionCheck.canDelete) {
        return NextResponse.json({
          error: 'Cannot delete user',
          details: deletionCheck.errors,
          warnings: deletionCheck.warnings,
          relatedData: deletionCheck.relatedData,
        }, { status: 400 });
      }

      await UserDeletionService.hardDeleteUser({
        userId: id,
        deletedBy: adminUser.id,
        reason,
        forceDelete,
      });

      logger.info('User hard deleted', {
        action: 'USER_HARD_DELETE',
        userId: adminUser.id,
        deletedUserId: id,
        reason,
        forceDelete,
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        message: 'User hard deleted successfully',
        deletionType: 'hard',
        warnings: deletionCheck.warnings,
      });
    }

    return NextResponse.json(
      { error: 'Invalid deletion type. Use "soft" or "hard"' },
      { status: 400 }
    );

  } catch (error: any) {
    logger.error('User deletion error', error instanceof Error ? error : new Error(String(error)), {
      action: 'USER_DELETE_ERROR',
      userId: adminUser?.id,
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/users/[id]/delete',
        method: 'POST',
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

// GET - Check if user can be deleted
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  let user: any = null;

  try {
    user = await requireAuth(request);

    const { id } = await params;
    
    const deletionCheck = await UserDeletionService.checkUserDeletion(id);

    return NextResponse.json({
      canDelete: deletionCheck.canDelete,
      warnings: deletionCheck.warnings,
      errors: deletionCheck.errors,
      relatedData: deletionCheck.relatedData,
    });

  } catch (error: any) {
    logger.error('User deletion check error', error instanceof Error ? error : new Error(String(error)), {
      action: 'USER_DELETE_CHECK_ERROR',
      userId: user?.id,
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/users/[id]/delete',
        method: 'GET',
        errorMessage: error.message
      }
    });
    
    if (error.message === 'Authentication required') {
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
