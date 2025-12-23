import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verifyToken, requireAuth } from '@/lib/auth';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET - Get single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        referrals: {
          select: {
            id: true,
            registrationId: true,
            firstName: true,
            lastName: true,
          },
        },
        referrer: {
          select: {
            id: true,
            registrationId: true,
            firstName: true,
            lastName: true,
          },
        },
        subscriptions: {
          include: {
            chitScheme: {
              select: {
                id: true,
                chitId: true,
                name: true,
                amount: true,
                duration: true,
                totalSlots: true,
              },
            },
          },
        },
        nominees: {
          select: {
            id: true,
            name: true,
            relation: true,
            age: true,
            dateOfBirth: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const { id } = await params;
    
    // Allow admin to update any user, or user to update their own account
    if (!decoded || (decoded.role !== 'ADMIN' && decoded.userId !== id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, email, phone, address, role, isActive, nominee, referredBy } = body;

    // Validate required fields (email is optional)
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
    }

    // Check if phone is already taken by another user
    const existingPhoneUser = await prisma.user.findFirst({
      where: {
        phone: body.phone,
        id: { not: id },
      },
    });

    if (existingPhoneUser) {
      return NextResponse.json({ error: 'Phone number already exists' }, { status: 400 });
    }

    // Check if email is already taken by another user (if provided)
    if (email && email.trim()) {
      const existingEmailUser = await prisma.user.findFirst({
        where: {
          email,
          id: { not: id },
        },
      });

      if (existingEmailUser) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }
    }

    // Validate and process referredBy if provided
    let referrerId = null;
    if (referredBy !== undefined) {
      if (referredBy === null || referredBy === '') {
        // Allow clearing referrer
        referrerId = null;
      } else if (referredBy === id) {
        // Self-referral: allow without restriction
        referrerId = id;
      } else {
        // Validate that the referrer exists
        const referrer = await prisma.user.findUnique({
          where: { id: referredBy },
        });

        if (!referrer) {
          return NextResponse.json(
            { error: 'Invalid referrer ID' },
            { status: 400 }
          );
        }
        referrerId = referredBy;
      }
    }

    // Update user and handle nominee data
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Prepare update data
      const updateData: any = {
        firstName,
        lastName,
        email: email && email.trim() ? email : null,
        phone,
        address,
      };

      // Only allow admin to update role and isActive
      if (decoded.role === 'ADMIN') {
        updateData.role = role;
        updateData.isActive = isActive;
      }

      // Update referredBy if provided
      if (referredBy !== undefined) {
        updateData.referredBy = referrerId;
      }

      // Update user basic information
      const user = await tx.user.update({
        where: { id },
        data: updateData,
      });

      // Handle nominee data
      if (nominee) {
        // Delete existing nominees
        await tx.nominee.deleteMany({
          where: { userId: id },
        });

        // Create new nominee if any data is provided
        if (nominee.name || nominee.relation || nominee.age || nominee.dateOfBirth) {
          await tx.nominee.create({
            data: {
              userId: id,
              name: nominee.name ? nominee.name.trim() : '',
              relation: nominee.relation || '',
              age: nominee.age || null,
              dateOfBirth: nominee.dateOfBirth ? new Date(nominee.dateOfBirth) : null,
            },
          });
        }
      }

      // Return user with nominee data and referrer info
      return await tx.user.findUnique({
        where: { id },
        include: {
          nominees: {
            select: {
              id: true,
              name: true,
              relation: true,
              age: true,
              dateOfBirth: true,
            },
          },
          referrer: {
            select: {
              id: true,
              registrationId: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  let adminUser: any = null;

  try {
    // Require admin authentication
    adminUser = await requireAuth(request, 'ADMIN');

    const { id } = await params;

    // Check if user has active subscriptions
    const activeSubscriptions = await prisma.chitSubscription.findMany({
      where: {
        userId: id,
        status: 'ACTIVE',
      },
    });

    if (activeSubscriptions.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete user with active subscriptions' 
      }, { status: 400 });
    }

    // Delete user and related data using transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update all users who were referred by this user to remove the referral relationship
      await tx.user.updateMany({
        where: { referredBy: id },
        data: { referredBy: null }
      });

      // 2. Delete payouts first (they reference subscriptions)
      await tx.payout.deleteMany({
        where: { userId: id }
      });

      // 3. Delete subscriptions
      await tx.chitSubscription.deleteMany({
        where: { userId: id }
      });

      // 4. Delete nominees (has CASCADE delete)
      await tx.nominee.deleteMany({
        where: { userId: id }
      });

      // 5. Delete existing audit logs for the user being deleted
      await tx.auditLog.deleteMany({
        where: { userId: id }
      });

      // 6. Create audit log for the deletion action
      // Use null userId to avoid foreign key constraint if admin is deleting themselves
      await tx.auditLog.create({
        data: {
          userId: adminUser.id === id ? null : adminUser.id,
          action: 'USER_DELETE',
          details: `Deleted user ${id}${adminUser.id === id ? ' (self-deletion)' : ''}`,
          ipAddress,
          userAgent,
        }
      });

      // 7. Finally delete the user
      await tx.user.delete({
        where: { id }
      });
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    logger.error('User deletion error', error instanceof Error ? error : new Error(String(error)), {
      action: 'USER_DELETE_ERROR',
      userId: adminUser?.id,
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/users/[id]',
        method: 'DELETE',
        errorMessage: error.message
      }
    });
    
    // Handle specific Prisma errors
    if (error.code === 'P2003') {
      return NextResponse.json({ 
        error: 'Cannot delete user due to existing relationships. Please contact support.' 
      }, { status: 400 });
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    if (error.message === 'Authentication required' || error.message === 'Insufficient permissions') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
