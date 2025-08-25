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
    const { payoutIds } = body;

    if (!payoutIds || !Array.isArray(payoutIds) || payoutIds.length === 0) {
      return NextResponse.json({ error: 'Invalid payout IDs' }, { status: 400 });
    }

    // Delete payouts
    const deletedPayouts = await prisma.payout.deleteMany({
      where: {
        id: { in: payoutIds },
      },
    });

    return NextResponse.json({ 
      message: `${deletedPayouts.count} payouts deleted successfully` 
    });
  } catch (error) {
    console.error('Error bulk deleting payouts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
