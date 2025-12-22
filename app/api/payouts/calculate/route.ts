import { NextRequest, NextResponse } from 'next/server';
import { prisma, isOrganizationUserByRegistrationId } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { PayoutCalculator } from '@/lib/payout-calculator';
import logger from '@/lib/logger';

// Function to calculate actual referral counts by step
async function calculateActualReferralCountsByStep(userId: string, maxSteps: number = 100): Promise<number[]> {
  const counts: number[] = [];
  let currentLevelUsers = [userId];
  
  for (let step = 1; step <= maxSteps; step++) {
    // Find all users referred by users in the current level
    const nextLevelUsers = await prisma.user.findMany({
      where: {
        referredBy: {
          in: currentLevelUsers,
        },
      },
      select: {
        id: true,
      },
    });
    
    const count = nextLevelUsers.length;
    counts.push(count);
    
    // If no referrals found, break early
    if (count === 0) {
      break;
    }
    
    // Update current level for next iteration
    currentLevelUsers = nextLevelUsers.map(user => user.id);
  }
  
  return counts;
}

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  let user: any = null;

  try {
    user = await requireAuth(request, 'ADMIN');

    const body = await request.json();
    const { subscriptionId, maxSteps } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    // Use provided maxSteps or default to 100
    const stepsToCalculate = maxSteps && maxSteps > 0 ? maxSteps : 100;

    // Get subscription details with user and chit scheme
    const subscription = await prisma.chitSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        user: {
          select: {
            id: true,
            registrationId: true,
            firstName: true,
            lastName: true,
          },
        },
        chitScheme: {
          select: {
            id: true,
            chitId: true,
            name: true,
            amount: true,
            duration: true,
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Prevent calculating payouts for organization user subscriptions
    if (isOrganizationUserByRegistrationId(subscription.user.registrationId)) {
      return NextResponse.json(
        { error: 'Cannot calculate payouts for organization user subscriptions' },
        { status: 400 }
      );
    }

    // Count direct referrals for the user
    const directReferralCount = await prisma.user.count({
      where: { referredBy: subscription.userId },
    });

    // Count total downline (all levels)
    const totalDownlineCount = await countTotalDownline(subscription.userId);

    // Calculate actual referral counts by step
    const actualReferralCounts = await calculateActualReferralCountsByStep(subscription.userId, stepsToCalculate);

    // Determine club tier based on chit scheme amount (as per PDF)
    const chitAmount = Number(subscription.chitScheme.amount);
    let clubTier = 'EXECUTIVE';
    let baseRate = 50;

    if (chitAmount >= 1000000) { // ₹10,00,000
      clubTier = 'DIAMOND';
      baseRate = 1000;
    } else if (chitAmount >= 500000) { // ₹5,00,000
      clubTier = 'CHAIRMAN';
      baseRate = 500;
    } else if (chitAmount >= 300000) { // ₹3,00,000
      clubTier = 'REGIONAL';
      baseRate = 300;
    } else if (chitAmount >= 200000) { // ₹2,00,000
      clubTier = 'MANAGER';
      baseRate = 200;
    } else if (chitAmount >= 100000) { // ₹1,00,000
      clubTier = 'DEVELOPMENT';
      baseRate = 100;
    } else if (chitAmount >= 50000) { // ₹50,000
      clubTier = 'EXECUTIVE';
      baseRate = 50;
    }

    // Calculate payout using actual referral counts
    const payoutResult = PayoutCalculator.calculatePayoutWithActualCounts(
      baseRate,
      actualReferralCounts
    );

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        subscriberId: subscription.subscriberId,
        userId: subscription.userId,
        user: subscription.user,
        chitScheme: subscription.chitScheme,
      },
      referralStats: {
        directReferralCount,
        totalDownlineCount,
        actualReferralCountsByStep: actualReferralCounts,
      },
      clubTier,
      baseRate,
      calculatedPayout: {
        totalPayout: payoutResult.totalPayout,
        stepDetails: payoutResult.steps,
      },
    });

  } catch (error: any) {
    logger.error('Calculate payout error', error instanceof Error ? error : new Error(String(error)), {
      action: 'PAYOUT_CALCULATE_API_ERROR',
      userId: user?.id,
      registrationId: user?.registrationId,
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/payouts/calculate',
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

// Recursive function to count total downline
async function countTotalDownline(userId: string): Promise<number> {
  const directReferrals = await prisma.user.findMany({
    where: { referredBy: userId },
    select: { id: true },
  });

  let totalCount = directReferrals.length;

  // Recursively count referrals of referrals
  for (const referral of directReferrals) {
    totalCount += await countTotalDownline(referral.id);
  }

  return totalCount;
}
