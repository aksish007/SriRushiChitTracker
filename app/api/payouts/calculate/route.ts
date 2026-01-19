import { NextRequest, NextResponse } from 'next/server';
import { prisma, isOrganizationUserByRegistrationId } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { PayoutCalculator } from '@/lib/payout-calculator';
import logger from '@/lib/logger';

// Interface for user step assignment
interface UserStepAssignment {
  userId: string;
  stepNumber: number;
  joinOrder: number; // Position in join sequence
}

// Function to assign step number based on join order
function assignStepToUser(userIndex: number): number {
  // userIndex is 1-based (1 = first joiner after root)
  if (userIndex === 0) return 0; // Root
  
  let cumulativeCount = 0;
  for (let step = 1; step <= 9; step++) {
    const stepSize = Math.pow(3, step);
    cumulativeCount += stepSize;
    if (userIndex <= cumulativeCount) {
      return step;
    }
  }
  return 9; // Default to step 9 if beyond
}

// Get all users referred by a user (recursively via referral hierarchy)
// Includes self-referrals (users who refer themselves)
async function getAllReferredUsers(userId: string, visited: Set<string> = new Set()): Promise<Array<{ id: string }>> {
  if (visited.has(userId)) {
    return []; // Prevent cycles (but self-referrals are already captured in directReferrals)
  }
  
  visited.add(userId);
  
  // Get direct referrals - this includes self-referrals (where referredBy === userId)
  const directReferrals = await prisma.user.findMany({
    where: { referredBy: userId },
    select: { id: true },
  });
  
  // Include self-referrals explicitly (users who refer themselves)
  // This ensures self-referrals are always counted
  const allReferrals: Array<{ id: string }> = [...directReferrals];
  
  // Recursively get referrals of referrals (but skip if it's the same user to prevent infinite loops)
  for (const referral of directReferrals) {
    if (referral.id !== userId) {
      // Only recurse for non-self referrals to prevent cycles
      const nestedReferrals = await getAllReferredUsers(referral.id, visited);
      allReferrals.push(...nestedReferrals);
    }
    // Self-referrals are already in allReferrals, no need to recurse
  }
  
  return allReferrals;
}

// Get all downline users for a root user (recursively)
// Includes self-referrals but prevents infinite loops
async function getAllDownlineUsers(rootUserId: string, visited: Set<string> = new Set()): Promise<Array<{ id: string; createdAt: Date }>> {
  if (visited.has(rootUserId)) {
    return []; // Prevent cycles
  }
  
  visited.add(rootUserId);
  
  // Get direct referrals - includes self-referrals (where referredBy === rootUserId)
  const directReferrals = await prisma.user.findMany({
    where: { referredBy: rootUserId },
    select: { 
      id: true,
      createdAt: true,
    },
  });
  
  const allDownline: Array<{ id: string; createdAt: Date }> = [...directReferrals];
  
  // Recursively get downline of downline (but skip self-referrals to prevent infinite loops)
  for (const referral of directReferrals) {
    if (referral.id !== rootUserId) {
      // Only recurse for non-self referrals to prevent cycles
      const nestedDownline = await getAllDownlineUsers(referral.id, visited);
      allDownline.push(...nestedDownline);
    }
    // Self-referrals are already in allDownline, no need to recurse
  }
  
  return allDownline;
}

// Build sequential steps for root user
async function buildSequentialStepsForRoot(rootUserId: string): Promise<Map<string, UserStepAssignment>> {
  // Get all downline users (via referral hierarchy)
  const allDownline = await getAllDownlineUsers(rootUserId);
  
  // Order by createdAt (join order)
  const sortedDownline = allDownline.sort((a, b) => {
    const dateA = a.createdAt.getTime();
    const dateB = b.createdAt.getTime();
    if (dateA !== dateB) {
      return dateA - dateB;
    }
    // If same timestamp, sort by ID for consistency
    return a.id.localeCompare(b.id);
  });
  
  // Assign step numbers based on sequential position
  const stepAssignments = new Map<string, UserStepAssignment>();
  
  sortedDownline.forEach((user, index) => {
    const stepNumber = assignStepToUser(index + 1); // +1 because root is 0
    stepAssignments.set(user.id, {
      userId: user.id,
      stepNumber,
      joinOrder: index + 1,
    });
  });
  
  return stepAssignments;
}

// Calculate referral counts by sequential step
async function calculateReferralCountsBySequentialStep(
  userId: string,
  rootUserId: string,
  maxSteps: number = 100
): Promise<number[]> {
  // 1. Build step assignments for root
  const stepAssignments = await buildSequentialStepsForRoot(rootUserId);
  
  // 2. Get user's step number
  // If user is the root, they're in Step 0
  const isRoot = userId === rootUserId;
  const userStep = isRoot ? 0 : stepAssignments.get(userId)?.stepNumber;
  
  if (userStep === undefined && !isRoot) {
    // User not found in downline and not root, return empty array
    return [];
  }
  
  // 3. Get all users referred by this user (recursively)
  // This includes self-referrals (users where referredBy === userId)
  const referredUsers = await getAllReferredUsers(userId);
  const referredUserIds = new Set(referredUsers.map(u => u.id));
  
  // 4. Build a map of step number -> count of referred users in that step
  // This is more efficient than iterating all assignments for each step
  const stepCounts = new Map<number, number>();
  
  // Initialize counts for all relevant steps
  const startStep = isRoot ? 1 : userStep + 1; // Root starts from Step 1, others from their next step
  const maxStepToCheck = Math.min(startStep + maxSteps - 1, 9); // Cap at step 9
  for (let step = startStep; step <= maxStepToCheck; step++) {
    stepCounts.set(step, 0);
  }
  
  // Iterate through referred users once and count them by step
  // Self-referrals are included in referredUserIds and will be counted if they appear in subsequent steps
  for (const referredUserId of referredUserIds) {
    const assignment = stepAssignments.get(referredUserId);
    if (assignment) {
      const step = assignment.stepNumber;
      if (step >= startStep && step <= maxStepToCheck) {
        stepCounts.set(step, (stepCounts.get(step) || 0) + 1);
      }
    }
  }
  
  // Build the counts array in order
  const counts: number[] = [];
  for (let step = startStep; step <= maxStepToCheck; step++) {
    counts.push(stepCounts.get(step) || 0);
  }
  
  return counts;
}

// Legacy function - kept for reference but deprecated
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

    // Calculate referral counts by sequential step (new method)
    // Use subscription user as root (they're the one getting paid)
    const actualReferralCounts = await calculateReferralCountsBySequentialStep(
      subscription.userId,
      subscription.userId, // Root is the subscription user
      stepsToCalculate
    );

    // Handle empty referral counts (user has no referrals in subsequent steps)
    let payoutResult;
    if (actualReferralCounts.length === 0) {
      // Return zero payout with empty steps
      payoutResult = {
        clubBaseRate: baseRate,
        totalPayout: 0,
        steps: [],
        calculationDetails: {
          formula: 'Actual referral counts based calculation',
          totalSteps: 0,
          calculatedAt: new Date(),
        },
      };
    } else {
      // Calculate payout using actual referral counts
      payoutResult = PayoutCalculator.calculatePayoutWithActualCounts(
        baseRate,
        actualReferralCounts
      );
    }

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
