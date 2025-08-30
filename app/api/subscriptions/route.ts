import { NextRequest, NextResponse } from 'next/server';
import { prisma, generateSubscriberId } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { subscriptionSchema } from '@/lib/validations';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const chitId = searchParams.get('chitId') || '';
    const userId = searchParams.get('userId');
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    let where: any = {};
    
    if (userId && user.role === 'ADMIN') {
      where.userId = userId;
    } else if (user.role === 'USER') {
      where.userId = user.id;
    }

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search } } },
        { user: { lastName: { contains: search } } },
        { user: { registrationId: { contains: search } } },
        { subscriberId: { contains: search } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (chitId && chitId !== 'all') {
      where.chitScheme = {
        chitId: chitId
      };
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortField === 'status') {
      orderBy.status = sortOrder;
    } else if (sortField === 'joinedAt') {
      orderBy.joinedAt = sortOrder;
    } else if (sortField === 'userName') {
      orderBy.user = { firstName: sortOrder };
    } else if (sortField === 'schemeName') {
      orderBy.chitScheme = { name: sortOrder };
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [subscriptions, total] = await Promise.all([
      prisma.chitSubscription.findMany({
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
        orderBy,
        skip,
        take: limit,
      }),
      prisma.chitSubscription.count({ where }),
    ]);

    return NextResponse.json({ 
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
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

    const subscriberId = await generateSubscriberIdWithNumber(chitScheme.chitId);

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