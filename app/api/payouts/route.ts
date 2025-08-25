import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { payoutSchema } from '@/lib/validations';

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
    const month = searchParams.get('month') || '';
    const year = searchParams.get('year') || '';
    const userId = searchParams.get('userId');
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    let where: any = {};

    if (user.role === 'USER') {
      where.userId = user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (month && month !== 'all') {
      where.month = parseInt(month);
    }

    if (year && year !== 'all') {
      where.year = parseInt(year);
    }

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search } } },
        { user: { lastName: { contains: search } } },
        { user: { registrationId: { contains: search } } },
      ];
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortField === 'amount') {
      orderBy.amount = sortOrder;
    } else if (sortField === 'month') {
      orderBy.month = sortOrder;
    } else if (sortField === 'year') {
      orderBy.year = sortOrder;
    } else if (sortField === 'status') {
      orderBy.status = sortOrder;
    } else if (sortField === 'paidAt') {
      orderBy.paidAt = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
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
          subscription: {
            include: {
              chitScheme: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.payout.count({ where }),
    ]);

    return NextResponse.json({ 
      payouts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get payouts error:', error);
    
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
    const payoutData = payoutSchema.parse(body);

    // Check if subscription exists
    const subscription = await prisma.chitSubscription.findUnique({
      where: { id: payoutData.subscriptionId },
      include: {
        user: true,
        chitScheme: true,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Check if payout already exists for this month/year
    const existingPayout = await prisma.payout.findUnique({
      where: {
        subscriptionId_month_year: {
          subscriptionId: payoutData.subscriptionId,
          month: payoutData.month,
          year: payoutData.year,
        },
      },
    });

    if (existingPayout) {
      return NextResponse.json(
        { error: 'Payout already exists for this month/year' },
        { status: 400 }
      );
    }

    const newPayout = await prisma.payout.create({
      data: {
        userId: subscription.userId,
        subscriptionId: payoutData.subscriptionId,
        amount: payoutData.amount,
        month: payoutData.month,
        year: payoutData.year,
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
        subscription: {
          include: {
            chitScheme: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'PAYOUT_CREATE',
        details: `Created payout of ${payoutData.amount} for subscription: ${subscription.subscriberId}`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({ payout: newPayout });
  } catch (error: any) {
    console.error('Create payout error:', error);
    
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