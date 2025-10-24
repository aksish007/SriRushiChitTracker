import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Get single subscription
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const subscription = await prisma.chitSubscription.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            registrationId: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        chitScheme: true,
        payouts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update subscription
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { status, subscriberId } = body;

    // Validate status if provided
    if (status && !['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Validate subscriber ID if provided
    if (subscriberId !== undefined) {
      if (!subscriberId || !subscriberId.trim()) {
        return NextResponse.json({ error: 'Subscriber ID cannot be empty' }, { status: 400 });
      }

      const { id } = await params;
      
      // Get the current subscription to check the chit scheme
      const currentSubscription = await prisma.chitSubscription.findUnique({
        where: { id },
        select: { chitSchemeId: true, subscriberId: true },
      });

      if (!currentSubscription) {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }

      // Check if new subscriber ID already exists in the same chit scheme (excluding current subscription)
      const existingSubscription = await prisma.chitSubscription.findFirst({
        where: {
          chitSchemeId: currentSubscription.chitSchemeId,
          subscriberId: subscriberId.trim(),
          id: { not: id },
        },
      });

      if (existingSubscription) {
        return NextResponse.json(
          { error: `Subscriber ID ${subscriberId} already exists in this chit scheme` },
          { status: 400 }
        );
      }
    }

    const { id } = await params;
    
    // Build update data
    const updateData: any = {};
    if (status) {
      updateData.status = status;
      updateData.completedAt = status === 'COMPLETED' ? new Date() : null;
    }
    if (subscriberId !== undefined) {
      updateData.subscriberId = subscriberId.trim();
    }

    const updatedSubscription = await prisma.chitSubscription.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            registrationId: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        chitScheme: true,
      },
    });

    return NextResponse.json({ subscription: updatedSubscription });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete subscription
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if subscription has paid payouts
    const paidPayouts = await prisma.payout.findMany({
      where: {
        subscriptionId: id,
        status: 'PAID',
      },
    });

    if (paidPayouts.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete subscription with paid payouts' 
      }, { status: 400 });
    }

    // Delete subscription
    await prisma.chitSubscription.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
