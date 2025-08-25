import { NextRequest, NextResponse } from 'next/server';
import { prisma, generateSubscriberId } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { subscriptionSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const where = userId && user.role === 'ADMIN' 
      ? { userId } 
      : user.role === 'USER' 
        ? { userId: user.id }
        : {};

    const subscriptions = await prisma.chitSubscription.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ subscriptions });
  } catch (error: any) {
    console.error('Get subscriptions error:', error);
    
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

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAuth(request, 'ADMIN');

    const body = await request.json();
    const { userId, chitSchemeId } = subscriptionSchema.parse(body);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if chit scheme exists
    const chitScheme = await prisma.chitScheme.findUnique({
      where: { id: chitSchemeId },
    });

    if (!chitScheme) {
      return NextResponse.json(
        { error: 'Chit scheme not found' },
        { status: 404 }
      );
    }

    // Check if user already subscribed to this scheme
    const existingSubscription = await prisma.chitSubscription.findFirst({
      where: {
        userId,
        chitSchemeId,
        status: 'ACTIVE',
      },
    });

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'User already has an active subscription to this chit scheme' },
        { status: 400 }
      );
    }

    // Check if scheme has available slots
    const activeSubscriptions = await prisma.chitSubscription.count({
      where: {
        chitSchemeId,
        status: 'ACTIVE',
      },
    });

    if (activeSubscriptions >= chitScheme.totalSlots) {
      return NextResponse.json(
        { error: 'Chit scheme is full' },
        { status: 400 }
      );
    }

    const subscriberId = generateSubscriberId(chitScheme.chitId);

    const newSubscription = await prisma.chitSubscription.create({
      data: {
        subscriberId,
        userId,
        chitSchemeId,
      },
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'SUBSCRIPTION_CREATE',
        details: `Created subscription: ${newSubscription.subscriberId} for user: ${user.registrationId}`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({ subscription: newSubscription });
  } catch (error: any) {
    console.error('Create subscription error:', error);
    
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