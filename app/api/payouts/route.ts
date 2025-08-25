import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { payoutSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let where: any = {};

    if (user.role === 'USER') {
      where.userId = user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (month) {
      where.month = parseInt(month);
    }

    if (year) {
      where.year = parseInt(year);
    }

    const payouts = await prisma.payout.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ payouts });
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