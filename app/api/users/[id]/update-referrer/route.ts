import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verifyToken, requireAuth } from '@/lib/auth';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  let user: any = null;

  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const { id } = await params;

    // Allow admin to update any user's referrer, or user to update their own referrer
    if (!decoded || (decoded.role !== 'ADMIN' && decoded.userId !== id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    user = decoded;

    const body = await request.json();
    const { referredBy } = body;

    // Validate that user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        registrationId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let referrerId = null;

    // Handle referrer update
    if (referredBy === null || referredBy === '' || referredBy === undefined) {
      // Clear referrer
      referrerId = null;
    } else if (referredBy === id) {
      // Self-referral: allow without restriction
      referrerId = id;
    } else {
      // Validate that the referrer exists
      const referrer = await prisma.user.findUnique({
        where: { id: referredBy },
        select: {
          id: true,
          registrationId: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!referrer) {
        return NextResponse.json(
          { error: 'Invalid referrer ID' },
          { status: 400 }
        );
      }
      referrerId = referredBy;
    }

    // Update referrer
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { referredBy: referrerId },
      include: {
        referrer: {
          select: {
            id: true,
            registrationId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_UPDATE_REFERRER',
        details: `Updated referrer for user ${targetUser.registrationId}${referrerId === id ? ' (self-referral)' : referrerId ? ` to ${updatedUser.referrer?.registrationId}` : ' (cleared)'}`,
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        registrationId: updatedUser.registrationId,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        referredBy: updatedUser.referredBy,
        referrer: updatedUser.referrer,
      },
    });
  } catch (error: any) {
    logger.error('Update referrer error', error instanceof Error ? error : new Error(String(error)), {
      action: 'UPDATE_REFERRER_ERROR',
      userId: user?.id,
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/users/[id]/update-referrer',
        method: 'PUT',
        errorMessage: error.message,
      },
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

