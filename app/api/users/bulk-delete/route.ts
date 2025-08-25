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
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Invalid user IDs' }, { status: 400 });
    }

    // Check if any users have active subscriptions
    const usersWithActiveSubscriptions = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        subscriptions: {
          some: {
            status: 'ACTIVE',
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (usersWithActiveSubscriptions.length > 0) {
      const userNames = usersWithActiveSubscriptions
        .map(user => `${user.firstName} ${user.lastName}`)
        .join(', ');
      return NextResponse.json({ 
        error: `Cannot delete users with active subscriptions: ${userNames}` 
      }, { status: 400 });
    }

    // Delete users
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        id: { in: userIds },
      },
    });

    return NextResponse.json({ 
      message: `${deletedUsers.count} users deleted successfully` 
    });
  } catch (error) {
    console.error('Error bulk deleting users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
