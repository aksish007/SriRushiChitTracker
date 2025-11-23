import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

interface ReferralNode {
  id: string;
  registrationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  level: number;
  referredBy?: {
    id: string;
    registrationId: string;
    firstName: string;
    lastName: string;
  };
  children: ReferralNode[];
  subscriptionsCount: number;
  totalPayouts: number;
  chitGroups: Array<{
    chitId: string;
    name: string;
    amount: number;
    duration: number;
    status: string;
  }>;
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

  const nodes: ReferralNode[] = [];

  for (const user of users) {
    const children = await buildReferralTree(user.id, level + 1, maxLevel);
    const totalPayouts = user.payouts.reduce((sum, payout) => sum + Number(payout.amount), 0);
    const chitGroups = user.subscriptions.map(sub => ({
      chitId: sub.chitScheme.chitId,
      name: sub.chitScheme.name,
      amount: Number(sub.chitScheme.amount),
      duration: sub.chitScheme.duration,
      status: sub.status,
    }));

    nodes.push({
      id: user.id,
      registrationId: user.registrationId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || '',
      phone: user.phone,
      level: level + 1,
      referredBy: user.referrer ? {
        id: user.referrer.id,
        registrationId: user.referrer.registrationId,
        firstName: user.referrer.firstName,
        lastName: user.referrer.lastName,
      } : undefined,
      children,
      subscriptionsCount: user.subscriptions.length,
      totalPayouts,
      chitGroups,
    });
  }

  return nodes;
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

    const children = await buildReferralTree(targetUser.id);
    const totalPayouts = targetUser.payouts.reduce((sum, payout) => sum + Number(payout.amount), 0);
    const chitGroups = targetUser.subscriptions.map(sub => ({
      chitId: sub.chitScheme.chitId,
      name: sub.chitScheme.name,
      amount: Number(sub.chitScheme.amount),
      duration: sub.chitScheme.duration,
      status: sub.status,
    }));

    const rootNode: ReferralNode = {
      id: targetUser.id,
      registrationId: targetUser.registrationId,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      email: targetUser.email || '',
      phone: targetUser.phone,
      level: 0,
      children,
      subscriptionsCount: targetUser.subscriptions.length,
      totalPayouts,
      chitGroups,
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