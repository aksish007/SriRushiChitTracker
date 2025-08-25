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
    const { schemeIds, isActive } = body;

    if (!schemeIds || !Array.isArray(schemeIds) || schemeIds.length === 0) {
      return NextResponse.json({ error: 'Invalid scheme IDs' }, { status: 400 });
    }

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Invalid isActive value' }, { status: 400 });
    }

    // Update chit schemes
    const updatedSchemes = await prisma.chitScheme.updateMany({
      where: {
        id: { in: schemeIds },
      },
      data: {
        isActive,
      },
    });

    return NextResponse.json({ 
      message: `${updatedSchemes.count} chit schemes ${isActive ? 'activated' : 'deactivated'} successfully` 
    });
  } catch (error) {
    console.error('Error bulk updating chit scheme status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
