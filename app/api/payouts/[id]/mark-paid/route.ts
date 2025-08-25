import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await requireAuth(request, 'ADMIN');
    const payoutId = params.id;

    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        user: true,
        subscription: {
          include: {
            chitScheme: true,
          },
        },
      },
    });

    if (!payout) {
      return NextResponse.json(
        { error: 'Payout not found' },
        { status: 404 }
      );
    }

    if (payout.status === 'PAID') {
      return NextResponse.json(
        { error: 'Payout is already marked as paid' },
        { status: 400 }
      );
    }

    const updatedPayout = await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
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
        action: 'PAYOUT_PAID',
        details: `Marked payout as paid: ${updatedPayout.amount} for user: ${payout.user.registrationId}`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({ payout: updatedPayout });
  } catch (error: any) {
    console.error('Mark payout paid error:', error);
    
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