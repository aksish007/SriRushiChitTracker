import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
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
    const { payoutIds, status } = body;

    if (!payoutIds || !Array.isArray(payoutIds) || payoutIds.length === 0) {
      return NextResponse.json({ error: 'Invalid payout IDs' }, { status: 400 });
    }

    if (!status || !['PENDING', 'PAID', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Update payouts
    const updatedPayouts = await prisma.payout.updateMany({
      where: {
        id: { in: payoutIds },
      },
      data: {
        status,
        paidAt: status === 'PAID' ? new Date() : null,
      },
    });

    return NextResponse.json({ 
      message: `${updatedPayouts.count} payouts updated to ${status} successfully` 
    });
  } catch (error) {
    console.error('Error bulk updating payout status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
