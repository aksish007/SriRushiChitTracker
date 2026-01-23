import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

interface Member {
  id: string;
  registrationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  referredBy?: {
    id: string;
    registrationId: string;
    firstName: string;
    lastName: string;
  };
  subscriptionsCount: number;
  totalPayouts: number;
  chitGroups: Array<{
    chitId: string;
    name: string;
    amount: number;
    duration: number;
    status: string;
  }>;
  joinOrder: number;
}

interface Step {
  stepNumber: number;
  memberCount: number;
  expectedCount: number;
  members: Member[];
}

interface SequentialTreeResponse {
  rootUser: {
    id: string;
    registrationId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    subscriptionsCount: number;
    totalPayouts: number;
    chitGroups: Array<{
      chitId: string;
      name: string;
      amount: number;
      duration: number;
      status: string;
    }>;
  };
  steps: Step[];
  summary: {
    totalMembers: number;
    directMembers: number;
    indirectMembers: number;
  };
}

// Function to assign step number based on referral depth (pyramid scheme)
// Step 1: All direct referrals of root
// Step 2: All referrals of Step 1 members
// Step 3: All referrals of Step 2 members
// etc.
// This is based on referral depth, not join order

// Get all downline users for a root user (recursively, including self-referrals)
async function getAllDownlineUsersForTree(rootUserId: string, visited: Set<string> = new Set()): Promise<Array<{
  id: string;
  registrationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  referredBy: string | null;
  createdAt: Date;
}>> {
  if (visited.has(rootUserId)) {
    return []; // Prevent cycles
  }
  
  visited.add(rootUserId);
  
  // Get direct referrals - includes self-referrals (where referredBy === rootUserId)
  const directReferrals = await prisma.user.findMany({
    where: { referredBy: rootUserId },
    select: {
      id: true,
      registrationId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      referredBy: true,
      createdAt: true,
    },
  });
  
  const allDownline: Array<{
    id: string;
    registrationId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    referredBy: string | null;
    createdAt: Date;
  }> = [...directReferrals];
  
  // Recursively get downline of downline
  for (const referral of directReferrals) {
    if (referral.id !== rootUserId) {
      // Only recurse for non-self referrals to prevent cycles
      const nestedDownline = await getAllDownlineUsersForTree(referral.id, visited);
      allDownline.push(...nestedDownline);
    }
    // Self-referrals are already in allDownline, no need to recurse
  }
  
  return allDownline;
}

// Build sequential steps based on join order (only root's downline, including self-referrals)
async function buildSequentialSteps(rootUserId: string): Promise<SequentialTreeResponse> {
  // Get root user
  const rootUser = await prisma.user.findUnique({
    where: { id: rootUserId },
    select: {
      id: true,
      registrationId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      subscriptions: {
        where: { status: 'ACTIVE' },
        select: { 
          id: true,
          chitScheme: {
            select: {
              chitId: true,
              name: true,
              amount: true,
              duration: true,
            }
          },
          status: true,
        },
      },
      payouts: {
        where: { status: 'PAID' },
        select: { amount: true },
      },
    },
  });

  if (!rootUser) {
    throw new Error('Root user not found');
  }

  // Get all downline users (via referral hierarchy, including self-referrals)
  const downlineUsers = await getAllDownlineUsersForTree(rootUserId);
  
  // Get full user data for downline users, ordered by join time
  const downlineUserIds = downlineUsers.map(u => u.id);
  
  // If no downline users, return empty steps
  if (downlineUserIds.length === 0) {
    const steps: Step[] = [];
    for (let stepNum = 1; stepNum <= 9; stepNum++) {
      steps.push({
        stepNumber: stepNum,
        memberCount: 0,
        expectedCount: Math.pow(3, stepNum),
        members: [],
      });
    }
    
    const rootUserTotalPayouts = rootUser.payouts.reduce((sum, payout) => sum + Number(payout.amount), 0);
    const rootUserChitGroups = rootUser.subscriptions.map(sub => ({
      chitId: sub.chitScheme.chitId,
      name: sub.chitScheme.name,
      amount: Number(sub.chitScheme.amount),
      duration: sub.chitScheme.duration,
      status: sub.status,
    }));
    
    return {
      rootUser: {
        id: rootUser.id,
        registrationId: rootUser.registrationId,
        firstName: rootUser.firstName,
        lastName: rootUser.lastName,
        email: rootUser.email || '',
        phone: rootUser.phone,
        subscriptionsCount: rootUser.subscriptions.length,
        totalPayouts: rootUserTotalPayouts,
        chitGroups: rootUserChitGroups,
      },
      steps,
      summary: {
        totalMembers: 0,
        directMembers: 0,
        indirectMembers: 0,
      },
    };
  }

  // Get full user data for downline users
  const allUsers = await prisma.user.findMany({
    where: { 
      id: { in: downlineUserIds },
    },
    select: {
      id: true,
      registrationId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      referredBy: true,
      referrer: {
        select: {
          id: true,
          registrationId: true,
          firstName: true,
          lastName: true,
        },
      },
      subscriptions: {
        where: { status: 'ACTIVE' },
        select: { 
          id: true,
          chitScheme: {
            select: {
              chitId: true,
              name: true,
              amount: true,
              duration: true,
            }
          },
          status: true,
        },
      },
      payouts: {
        where: { status: 'PAID' },
        select: { amount: true },
      },
    },
  });

  // Build a map of user ID to step number based on referral depth (pyramid scheme)
  // Step 1: All direct referrals of root
  // Step 2: All referrals of Step 1 members
  // Step 3: All referrals of Step 2 members, etc.
  const userStepMap = new Map<string, number>();
  const usersByStep: Map<number, Member[]> = new Map();
  
  // Create a map for quick user lookup
  const userMap = new Map<string, typeof allUsers[0]>();
  allUsers.forEach(user => userMap.set(user.id, user));

  // BFS traversal to assign steps based on referral depth
  let currentStepUsers: string[] = [rootUserId]; // Start with root
  let currentStep = 1;
  const processed = new Set<string>([rootUserId]); // Track processed users

  while (currentStepUsers.length > 0 && currentStep <= 9) {
    const nextStepUsers: string[] = [];
    
    // For each user in current step, find their direct referrals
    for (const currentUserId of currentStepUsers) {
      // Find all users referred by current step users
      for (const user of allUsers) {
        if (!processed.has(user.id) && user.referredBy === currentUserId) {
          userStepMap.set(user.id, currentStep);
          processed.add(user.id);
          nextStepUsers.push(user.id);
        }
      }
    }
    
    // Move to next step
    currentStepUsers = nextStepUsers;
    currentStep++;
  }

  // Assign remaining users (those not in the referral chain) to step 9
  for (const user of allUsers) {
    if (!userStepMap.has(user.id)) {
      userStepMap.set(user.id, 9);
    }
  }

  // Group users by step and create Member objects
  let joinOrder = 1;
  allUsers.forEach((user) => {
    const step = userStepMap.get(user.id) || 9;
    const totalPayouts = user.payouts.reduce((sum, payout) => sum + Number(payout.amount), 0);
    const chitGroups = user.subscriptions.map(sub => ({
      chitId: sub.chitScheme.chitId,
      name: sub.chitScheme.name,
      amount: Number(sub.chitScheme.amount),
      duration: sub.chitScheme.duration,
      status: sub.status,
    }));

    const member: Member = {
      id: user.id,
      registrationId: user.registrationId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || '',
      phone: user.phone,
      referredBy: user.referrer ? {
        id: user.referrer.id,
        registrationId: user.referrer.registrationId,
        firstName: user.referrer.firstName,
        lastName: user.referrer.lastName,
      } : undefined,
      subscriptionsCount: user.subscriptions.length,
      totalPayouts,
      chitGroups,
      joinOrder: joinOrder++,
    };

    if (!usersByStep.has(step)) {
      usersByStep.set(step, []);
    }
    usersByStep.get(step)!.push(member);
  });

  // Build steps array
  const steps: Step[] = [];
  for (let stepNum = 1; stepNum <= 9; stepNum++) {
    const expectedCount = Math.pow(3, stepNum);
    const members = usersByStep.get(stepNum) || [];
    steps.push({
      stepNumber: stepNum,
      memberCount: members.length,
      expectedCount,
      members,
    });
  }

  // Calculate summary based on actual referral relationship, not step numbers
  // Direct = members directly referred by root user
  // Indirect = members referred by others (not root)
  const totalMembers = allUsers.length;
  const directMembers = allUsers.filter(user => 
    user.referrer?.id === rootUserId
  ).length;
  const indirectMembers = totalMembers - directMembers;

  // Build root user data
  const rootUserTotalPayouts = rootUser.payouts.reduce((sum, payout) => sum + Number(payout.amount), 0);
  const rootUserChitGroups = rootUser.subscriptions.map(sub => ({
    chitId: sub.chitScheme.chitId,
    name: sub.chitScheme.name,
    amount: Number(sub.chitScheme.amount),
    duration: sub.chitScheme.duration,
    status: sub.status,
  }));

  return {
    rootUser: {
      id: rootUser.id,
      registrationId: rootUser.registrationId,
      firstName: rootUser.firstName,
      lastName: rootUser.lastName,
      email: rootUser.email || '',
      phone: rootUser.phone,
      subscriptionsCount: rootUser.subscriptions.length,
      totalPayouts: rootUserTotalPayouts,
      chitGroups: rootUserChitGroups,
    },
    steps,
    summary: {
      totalMembers,
      directMembers,
      indirectMembers,
    },
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    const currentUser = await requireAuth(request);
    const { registrationId } = await params;

    // Find the target user by ID (since SearchableUser now sends user IDs)
    const targetUser = await prisma.user.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        registrationId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          select: { 
            id: true,
            chitScheme: {
              select: {
                chitId: true,
                name: true,
                amount: true,
                duration: true,
              }
            },
            status: true,
          },
        },
        payouts: {
          where: { status: 'PAID' },
          select: { amount: true },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check permissions - admin can view any tree, users can only view their own
    if (currentUser.role !== 'ADMIN' && currentUser.id !== registrationId) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Build sequential steps based on join order
    const sequentialData = await buildSequentialSteps(targetUser.id);

    return NextResponse.json(sequentialData);
  } catch (error: any) {
    console.error('Get referral tree error:', error);
    
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