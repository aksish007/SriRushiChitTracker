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
    const { userIds, isActive } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Invalid user IDs' }, { status: 400 });
    }

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Invalid isActive value' }, { status: 400 });
    }

    // Update users
    const updatedUsers = await prisma.user.updateMany({
      where: {
        id: { in: userIds },
      },
      data: {
        isActive,
      },
    });

    return NextResponse.json({ 
      message: `${updatedUsers.count} users ${isActive ? 'activated' : 'deactivated'} successfully` 
    });
  } catch (error) {
    console.error('Error bulk updating user status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
