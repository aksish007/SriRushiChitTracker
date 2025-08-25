import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
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
    const { subscriptionIds } = body;

    if (!subscriptionIds || !Array.isArray(subscriptionIds) || subscriptionIds.length === 0) {
      return NextResponse.json({ error: 'Invalid subscription IDs' }, { status: 400 });
    }

    // Check if any subscriptions have active payouts
    const subscriptionsWithPayouts = await prisma.chitSubscription.findMany({
      where: {
        id: { in: subscriptionIds },
        payouts: {
          some: {
            status: 'PAID',
          },
        },
      },
      select: {
        id: true,
        subscriberId: true,
      },
    });

    if (subscriptionsWithPayouts.length > 0) {
      const subscriberIds = subscriptionsWithPayouts
        .map(sub => sub.subscriberId)
        .join(', ');
      return NextResponse.json({ 
        error: `Cannot delete subscriptions with paid payouts: ${subscriberIds}` 
      }, { status: 400 });
    }

    // Delete subscriptions
    const deletedSubscriptions = await prisma.chitSubscription.deleteMany({
      where: {
        id: { in: subscriptionIds },
      },
    });

    return NextResponse.json({ 
      message: `${deletedSubscriptions.count} subscriptions deleted successfully` 
    });
  } catch (error) {
    console.error('Error bulk deleting subscriptions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
