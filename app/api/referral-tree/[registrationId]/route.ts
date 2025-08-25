import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

interface ReferralNode {
  id: string;
  registrationId: string;
  firstName: string;
  lastName: string;
  email: string;
  level: number;
  children: ReferralNode[];
  subscriptionsCount: number;
  totalPayouts: number;
}

async function buildReferralTree(userId: string, level: number = 0, maxLevel: number = 5): Promise<ReferralNode[]> {
  if (level > maxLevel) return [];

  const users = await prisma.user.findMany({
    where: { referredBy: userId },
    select: {
      id: true,
      registrationId: true,
      firstName: true,
      lastName: true,
      email: true,
      subscriptions: {
        where: { status: 'ACTIVE' },
        select: { id: true },
      },
      payouts: {
        where: { status: 'PAID' },
        select: { amount: true },
      },
    },
  });

  const nodes: ReferralNode[] = [];

  for (const user of users) {
    const children = await buildReferralTree(user.id, level + 1, maxLevel);
    const totalPayouts = user.payouts.reduce((sum, payout) => sum + Number(payout.amount), 0);

    nodes.push({
      id: user.id,
      registrationId: user.registrationId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      level: level + 1,
      children,
      subscriptionsCount: user.subscriptions.length,
      totalPayouts,
    });
  }

  return nodes;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { registrationId: string } }
) {
  try {
    const currentUser = await requireAuth(request);
    const registrationId = params.registrationId;

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { registrationId },
      select: {
        id: true,
        registrationId: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          select: { id: true },
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
    if (currentUser.role !== 'ADMIN' && currentUser.registrationId !== registrationId) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const children = await buildReferralTree(targetUser.id);
    const totalPayouts = targetUser.payouts.reduce((sum, payout) => sum + Number(payout.amount), 0);

    const rootNode: ReferralNode = {
      id: targetUser.id,
      registrationId: targetUser.registrationId,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      email: targetUser.email,
      level: 0,
      children,
      subscriptionsCount: targetUser.subscriptions.length,
      totalPayouts,
    };

    return NextResponse.json({ tree: rootNode });
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