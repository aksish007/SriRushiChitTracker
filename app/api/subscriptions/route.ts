import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { subscriptionSchema } from '@/lib/validations';
import { ORGANIZATION_REGISTRATION_ID } from '@/lib/constants';
import logger from '@/lib/logger';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  let user: any = null;

  try {
    user = await requireAuth(request);
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
    // Note: Organization subscriptions (with /01 subscriber IDs) are included in results
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
              nominees: {
                select: {
                  age: true,
                  dateOfBirth: true,
                },
              },
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
    logger.error('Get subscriptions error', error instanceof Error ? error : new Error(String(error)), {
      action: 'SUBSCRIPTIONS_API_GET_ERROR',
      userId: user?.id || 'unknown',
      registrationId: user?.registrationId || 'unknown',
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/subscriptions',
        method: 'GET',
        errorMessage: error.message
      }
    });
    
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
    const { userId, chitSchemeId, subscriberId, selfRefer } = subscriptionSchema.parse(body);

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

    // Check if subscriber ID already exists for this chit scheme
    const existingSubscription = await prisma.chitSubscription.findFirst({
      where: {
        chitSchemeId,
        subscriberId,
      },
    });

    if (existingSubscription) {
      return NextResponse.json(
        { error: `Subscriber ID ${subscriberId} already exists in this chit scheme` },
        { status: 400 }
      );
    }

    // Prevent non-organization users from getting /01 subscriber ID
    const subscriberNumber = subscriberId.match(/\/(\d+)$/);
    if (subscriberNumber && parseInt(subscriberNumber[1]) === 1) {
      const isOrgUser = user.registrationId === ORGANIZATION_REGISTRATION_ID;
      if (!isOrgUser) {
        return NextResponse.json(
          { error: 'Subscriber ID ending in /01 is reserved for the organization user' },
          { status: 400 }
        );
      }
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

    // Handle self-referral if requested
    if (selfRefer === true) {
      await prisma.user.update({
        where: { id: userId },
        data: { referredBy: userId },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'SUBSCRIPTION_CREATE',
        details: `Created subscription: ${newSubscription.subscriberId} for user: ${user.registrationId}${selfRefer ? ' (self-referred)' : ''}`,
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