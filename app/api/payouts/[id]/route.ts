import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Get single payout
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const payout = await prisma.payout.findUnique({
      where: { id: params.id },
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
            chitScheme: {
              select: {
                chitId: true,
                name: true,
                amount: true,
              },
            },
          },
        },
      },
    });

    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }

    return NextResponse.json({ payout });
  } catch (error) {
    console.error('Error fetching payout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update payout
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const { amount, month, year, status } = body;

    // Validate required fields
    if (!amount || !month || !year || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updatedPayout = await prisma.payout.update({
      where: { id: params.id },
      data: {
        amount: parseFloat(amount),
        month: parseInt(month),
        year: parseInt(year),
        status,
        paidAt: status === 'PAID' ? new Date() : null,
      },
    });

    return NextResponse.json({ payout: updatedPayout });
  } catch (error) {
    console.error('Error updating payout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete payout
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Delete payout
    await prisma.payout.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Payout deleted successfully' });
  } catch (error) {
    console.error('Error deleting payout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
