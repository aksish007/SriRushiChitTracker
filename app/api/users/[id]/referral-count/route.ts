import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import logger from '@/lib/logger';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

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

    // Check if user exists
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

    // Check permissions - admin can view any user's referral count, users can only view their own
    if (user.role !== 'ADMIN' && user.id !== id) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Count direct referrals
    const directReferralCount = await prisma.user.count({
      where: { referredBy: id },
    });

    // Count total downline (all levels)
    const totalDownlineCount = await countTotalDownline(id);

    return NextResponse.json({
      userId: id,
      registrationId: targetUser.registrationId,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      directReferralCount,
      totalDownlineCount,
    });

  } catch (error: any) {
    logger.error('Get referral count error', error instanceof Error ? error : new Error(String(error)), {
      action: 'REFERRAL_COUNT_API_ERROR',
      userId: user?.id,
      registrationId: user?.registrationId,
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/users/[id]/referral-count',
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

// Recursive function to count total downline
// Includes self-referrals but prevents infinite loops
async function countTotalDownline(userId: string, visited: Set<string> = new Set()): Promise<number> {
  if (visited.has(userId)) {
    return 0; // Prevent cycles
  }
  
  visited.add(userId);
  
  // Get direct referrals - includes self-referrals (where referredBy === userId)
  const directReferrals = await prisma.user.findMany({
    where: { referredBy: userId },
    select: { id: true },
  });

  let totalCount = directReferrals.length;

  // Recursively count referrals of referrals (but skip self-referrals to prevent infinite loops)
  for (const referral of directReferrals) {
    if (referral.id !== userId) {
      // Only recurse for non-self referrals to prevent cycles
      totalCount += await countTotalDownline(referral.id, visited);
    }
    // Self-referrals are already counted in directReferrals.length, no need to recurse
  }

  return totalCount;
}
