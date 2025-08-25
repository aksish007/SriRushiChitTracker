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
    const { schemeIds } = body;

    if (!schemeIds || !Array.isArray(schemeIds) || schemeIds.length === 0) {
      return NextResponse.json({ error: 'Invalid scheme IDs' }, { status: 400 });
    }

    // Check if any schemes have active subscriptions
    const schemesWithActiveSubscriptions = await prisma.chitScheme.findMany({
      where: {
        id: { in: schemeIds },
        subscriptions: {
          some: {
            status: 'ACTIVE',
          },
        },
      },
      select: {
        id: true,
        name: true,
        chitId: true,
      },
    });

    if (schemesWithActiveSubscriptions.length > 0) {
      const schemeNames = schemesWithActiveSubscriptions
        .map(scheme => `${scheme.name} (${scheme.chitId})`)
        .join(', ');
      return NextResponse.json({ 
        error: `Cannot delete chit schemes with active subscriptions: ${schemeNames}` 
      }, { status: 400 });
    }

    // Delete chit schemes
    const deletedSchemes = await prisma.chitScheme.deleteMany({
      where: {
        id: { in: schemeIds },
      },
    });

    return NextResponse.json({ 
      message: `${deletedSchemes.count} chit schemes deleted successfully` 
    });
  } catch (error) {
    console.error('Error bulk deleting chit schemes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
