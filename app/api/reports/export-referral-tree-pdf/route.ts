import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { generateReferralTreeReport } from '@/lib/pdf-generator';
import { PayoutCalculator } from '@/lib/payout-calculator';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Interface for user step assignment
interface UserStepAssignment {
  userId: string;
  stepNumber: number;
  joinOrder: number;
}

// Function to assign step number based on join order
function assignStepToUser(userIndex: number): number {
  if (userIndex === 0) return 0; // Root
  
  let cumulativeCount = 0;
  for (let step = 1; step <= 9; step++) {
    const stepSize = Math.pow(3, step);
    cumulativeCount += stepSize;
    if (userIndex <= cumulativeCount) {
      return step;
    }
  }
  return 9;
}

// Get all users referred by a user (optimized - breadth-first with batching)
// Includes self-referrals (users who refer themselves)
async function getAllReferredUsers(userId: string): Promise<Array<{ id: string }>> {
  const allReferrals: Array<{ id: string }> = [];
  const visited = new Set<string>([userId]);
  let currentLevel = [userId];
  
  // Breadth-first traversal: process level by level
  while (currentLevel.length > 0) {
    // Batch query: get all users at current level in one query
    const nextLevelUsers = await prisma.user.findMany({
      where: {
        referredBy: {
          in: currentLevel,
        },
      },
      select: {
        id: true,
      },
    });
    
    // Filter out already visited users (handles self-referrals and cycles)
    const newUsers = nextLevelUsers.filter(user => {
      if (visited.has(user.id)) {
        return false;
      }
      visited.add(user.id);
      return true;
    });
    
    allReferrals.push(...newUsers);
    
    // Prepare next level (only non-self-referrals)
    currentLevel = newUsers
      .filter(user => user.id !== userId)
      .map(user => user.id);
  }
  
  return allReferrals;
}

// Get all downline users for a root user (optimized - single query approach)
// Uses breadth-first traversal with batching to minimize database connections
async function getAllDownlineUsers(rootUserId: string): Promise<Array<{ id: string; createdAt: Date }>> {
  const allDownline: Array<{ id: string; createdAt: Date }> = [];
  const visited = new Set<string>([rootUserId]);
  let currentLevel = [rootUserId];
  
  // Breadth-first traversal: process level by level
  while (currentLevel.length > 0) {
    // Batch query: get all users at current level in one query
    const nextLevelUsers = await prisma.user.findMany({
      where: {
        referredBy: {
          in: currentLevel,
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
    });
    
    // Filter out already visited users (handles self-referrals and cycles)
    const newUsers = nextLevelUsers.filter(user => {
      if (visited.has(user.id)) {
        return false;
      }
      visited.add(user.id);
      return true;
    });
    
    allDownline.push(...newUsers);
    
    // Prepare next level (only non-self-referrals)
    currentLevel = newUsers
      .filter(user => user.id !== rootUserId)
      .map(user => user.id);
  }
  
  return allDownline;
}

// Build sequential steps for root user
async function buildSequentialStepsForRoot(rootUserId: string): Promise<Map<string, UserStepAssignment>> {
  const allDownline = await getAllDownlineUsers(rootUserId);
  
  const sortedDownline = allDownline.sort((a, b) => {
    const dateA = a.createdAt.getTime();
    const dateB = b.createdAt.getTime();
    if (dateA !== dateB) {
      return dateA - dateB;
    }
    return a.id.localeCompare(b.id);
  });
  
  const stepAssignments = new Map<string, UserStepAssignment>();
  
  sortedDownline.forEach((user, index) => {
    const stepNumber = assignStepToUser(index + 1);
    stepAssignments.set(user.id, {
      userId: user.id,
      stepNumber,
      joinOrder: index + 1,
    });
  });
  
  return stepAssignments;
}

// Calculate referral counts by sequential step (deprecated - now done inline for efficiency)
// Kept for reference but not used in optimized version
async function calculateReferralCountsBySequentialStep(
  userId: string,
  rootUserId: string,
  stepAssignments: Map<string, UserStepAssignment>,
  maxSteps: number = 100
): Promise<number[]> {
  // If user is the root, they're in Step 0
  const isRoot = userId === rootUserId;
  const userStep = isRoot ? 0 : stepAssignments.get(userId)?.stepNumber;
  
  if (userStep === undefined && !isRoot) {
    return [];
  }
  
  const referredUsers = await getAllReferredUsers(userId);
  const referredUserIds = new Set(referredUsers.map(u => u.id));
  
  // Build a map of step number -> count of referred users in that step
  const stepCounts = new Map<number, number>();
  
  const startStep = isRoot ? 1 : userStep + 1;
  const maxStepToCheck = Math.min(startStep + maxSteps - 1, 9);
  
  // Initialize counts for all relevant steps
  for (let step = startStep; step <= maxStepToCheck; step++) {
    stepCounts.set(step, 0);
  }
  
  // Iterate through referred users once and count them by step
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

// Determine club tier and base rate from chit amount
function getClubTierAndRate(chitAmount: number): { tier: string; rate: number } {
  if (chitAmount >= 1000000) {
    return { tier: 'DIAMOND', rate: 1000 };
  } else if (chitAmount >= 500000) {
    return { tier: 'CHAIRMAN', rate: 500 };
  } else if (chitAmount >= 300000) {
    return { tier: 'REGIONAL', rate: 300 };
  } else if (chitAmount >= 200000) {
    return { tier: 'MANAGER', rate: 200 };
  } else if (chitAmount >= 100000) {
    return { tier: 'DEVELOPMENT', rate: 100 };
  } else if (chitAmount >= 50000) {
    return { tier: 'EXECUTIVE', rate: 50 };
  }
  return { tier: 'EXECUTIVE', rate: 50 };
}

export async function POST(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const currentUser = await requireAuth(request);
    const body = await request.json();
    
    // Accept tree data directly from frontend
    const { treeData } = body;
    
    if (!treeData || !treeData.rootUser || !treeData.steps) {
      return NextResponse.json(
        { error: 'Tree data is required' },
        { status: 400 }
      );
    }

    // Transform frontend data format to PDF generator format
    const steps = treeData.steps.map((step: any) => ({
      step: step.stepNumber,
      referrals: step.members.map((member: any) => ({
        name: `${member.firstName} ${member.lastName}`,
        registrationId: member.registrationId,
        chitSchemes: member.chitGroups.map((group: any) => ({
          name: group.name,
          chitId: group.chitId,
          amount: group.amount,
        })),
        referredBy: member.referredBy
          ? `${member.referredBy.firstName} ${member.referredBy.lastName} (${member.referredBy.registrationId})`
          : 'N/A',
        incentiveAmount: 0, // Not calculated in frontend, set to 0 for tree view
      })),
    }));

    // Generate PDF
    const pdfBuffer = generateReferralTreeReport({
      rootUser: {
        name: `${treeData.rootUser.firstName} ${treeData.rootUser.lastName}`,
        registrationId: treeData.rootUser.registrationId,
      },
      steps,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'EXPORT_REFERRAL_TREE_PDF',
        details: `Exported referral tree PDF for ${treeData.rootUser.registrationId}`,
        ipAddress,
        userAgent,
      },
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="referral-tree-${treeData.rootUser.registrationId}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error: any) {
    logger.error('Export referral tree PDF error', error instanceof Error ? error : new Error(String(error)), {
      action: 'EXPORT_REFERRAL_TREE_PDF_ERROR',
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/reports/export-referral-tree-pdf',
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

// Keep GET endpoint for backward compatibility, but it's deprecated
export async function GET(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const currentUser = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get('registrationId');

    if (!registrationId) {
      return NextResponse.json(
        { error: 'Registration ID is required' },
        { status: 400 }
      );
    }

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { registrationId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: {
            chitScheme: true,
          },
        },
        referrer: {
          select: {
            firstName: true,
            lastName: true,
            registrationId: true,
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (currentUser.role !== 'ADMIN' && currentUser.id !== targetUser.id) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Build step assignments once and reuse (major optimization)
    const stepAssignments = await buildSequentialStepsForRoot(targetUser.id);
    
    // Build referral tree by steps using sequential step assignments
    const steps: Array<{
      step: number;
      referrals: Array<{
        name: string;
        registrationId: string;
        chitSchemes: Array<{ name: string; chitId: string; amount: number }>;
        referredBy: string;
        incentiveAmount: number;
      }>;
    }> = [];

    // Group all downline users by their sequential step
    const usersByStep = new Map<number, string[]>();
    for (const [userId, assignment] of stepAssignments.entries()) {
      if (!usersByStep.has(assignment.stepNumber)) {
        usersByStep.set(assignment.stepNumber, []);
      }
      usersByStep.get(assignment.stepNumber)!.push(userId);
    }

    // Fetch user details for each step (batch queries)
    for (let stepNum = 1; stepNum <= 9; stepNum++) {
      const userIds = usersByStep.get(stepNum);
      if (!userIds || userIds.length === 0) {
        continue;
      }

      // Batch query: get all users for this step in one query
      const stepUsers = await prisma.user.findMany({
        where: {
          id: {
            in: userIds,
          },
        },
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
            include: {
              chitScheme: true,
            },
          },
          referrer: {
            select: {
              firstName: true,
              lastName: true,
              registrationId: true,
            },
          },
        },
      });

      if (stepUsers.length === 0) {
        continue;
      }

      // Calculate incentives for all users in this step
      // Build referral maps once for efficiency
      const referralMaps = new Map<string, Set<string>>();
      
      const stepReferrals = await Promise.all(
        stepUsers.map(async (user) => {
          // Calculate incentive for this user based on their chit schemes
          let totalIncentive = 0;

          // Get referred users (with caching)
          let referredUserIds: Set<string>;
          if (referralMaps.has(user.id)) {
            referredUserIds = referralMaps.get(user.id)!;
          } else {
            const referredUsers = await getAllReferredUsers(user.id);
            referredUserIds = new Set(referredUsers.map(u => u.id));
            referralMaps.set(user.id, referredUserIds);
          }

          for (const subscription of user.subscriptions) {
            const chitAmount = Number(subscription.chitScheme.amount);
            const { rate } = getClubTierAndRate(chitAmount);
            
            // Count referred users in subsequent steps using cached stepAssignments
            const userStep = stepAssignments.get(user.id)?.stepNumber;
            if (userStep === undefined) continue;
            
            const startStep = userStep + 1;
            const maxStepToCheck = Math.min(startStep + 5 - 1, 9);
            
            const stepCounts = new Map<number, number>();
            for (let step = startStep; step <= maxStepToCheck; step++) {
              stepCounts.set(step, 0);
            }
            
            // Count referred users by step
            for (const referredUserId of referredUserIds) {
              const assignment = stepAssignments.get(referredUserId);
              if (assignment) {
                const step = assignment.stepNumber;
                if (step >= startStep && step <= maxStepToCheck) {
                  stepCounts.set(step, (stepCounts.get(step) || 0) + 1);
                }
              }
            }
            
            const actualCounts: number[] = [];
            for (let step = startStep; step <= maxStepToCheck; step++) {
              actualCounts.push(stepCounts.get(step) || 0);
            }
            
            if (actualCounts.length > 0 && actualCounts.some(count => count > 0)) {
              try {
                const payoutResult = PayoutCalculator.calculatePayoutWithActualCounts(rate, actualCounts);
                totalIncentive += payoutResult.steps.reduce((sum, s) => sum + s.stepPayout, 0);
              } catch (error) {
                // If calculation fails, skip this subscription
              }
            }
          }

          return {
            name: `${user.firstName} ${user.lastName}`,
            registrationId: user.registrationId,
            chitSchemes: user.subscriptions.map(sub => ({
              name: sub.chitScheme.name,
              chitId: sub.chitScheme.chitId,
              amount: Number(sub.chitScheme.amount),
            })),
            referredBy: user.referrer 
              ? `${user.referrer.firstName} ${user.referrer.lastName} (${user.referrer.registrationId})`
              : 'N/A',
            incentiveAmount: totalIncentive,
          };
        })
      );

      steps.push({
        step: stepNum,
        referrals: stepReferrals,
      });
    }

    // Generate PDF
    const pdfBuffer = generateReferralTreeReport({
      rootUser: {
        name: `${targetUser.firstName} ${targetUser.lastName}`,
        registrationId: targetUser.registrationId,
      },
      steps,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'EXPORT_REFERRAL_TREE_PDF',
        details: `Exported referral tree PDF for ${targetUser.registrationId}`,
        ipAddress,
        userAgent,
      },
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="referral-tree-${targetUser.registrationId}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error: any) {
    logger.error('Export referral tree PDF error', error instanceof Error ? error : new Error(String(error)), {
      action: 'EXPORT_REFERRAL_TREE_PDF_ERROR',
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/reports/export-referral-tree-pdf',
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

