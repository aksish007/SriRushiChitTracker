import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Get single chit scheme
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

    const scheme = await prisma.chitScheme.findUnique({
      where: { id: params.id },
      include: {
        subscriptions: {
          include: {
            user: {
              select: {
                registrationId: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!scheme) {
      return NextResponse.json({ error: 'Chit scheme not found' }, { status: 404 });
    }

    return NextResponse.json({ scheme });
  } catch (error) {
    console.error('Error fetching chit scheme:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update chit scheme
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
    const { chitId, name, amount, duration, totalSlots, description, isActive } = body;

    // Validate required fields
    if (!chitId || !name || !amount || !duration || !totalSlots) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if chitId is already taken by another scheme
    const existingScheme = await prisma.chitScheme.findFirst({
      where: {
        chitId,
        id: { not: params.id },
      },
    });

    if (existingScheme) {
      return NextResponse.json({ error: 'Chit ID already exists' }, { status: 400 });
    }

    const updatedScheme = await prisma.chitScheme.update({
      where: { id: params.id },
      data: {
        chitId,
        name,
        amount: parseFloat(amount),
        duration: parseInt(duration),
        totalSlots: parseInt(totalSlots),
        description,
        isActive,
      },
    });

    return NextResponse.json({ scheme: updatedScheme });
  } catch (error) {
    console.error('Error updating chit scheme:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete chit scheme
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

    // Check if scheme has active subscriptions
    const activeSubscriptions = await prisma.chitSubscription.findMany({
      where: {
        chitSchemeId: params.id,
        status: 'ACTIVE',
      },
    });

    if (activeSubscriptions.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete chit scheme with active subscriptions' 
      }, { status: 400 });
    }

    // Delete chit scheme
    await prisma.chitScheme.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Chit scheme deleted successfully' });
  } catch (error) {
    console.error('Error deleting chit scheme:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
