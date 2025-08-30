import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/lib/auth';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin role
    const user = await requireAuth(request);
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id: userId } = await params;

    // Find the user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, firstName: true, lastName: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!targetUser.phone) {
      return NextResponse.json({ error: 'User does not have a phone number' }, { status: 400 });
    }

    // Generate a simple password from phone number (last 6 digits)
    const phonePassword = targetUser.phone.slice(-6);

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: phonePassword // In production, this should be hashed
      }
    });

    return NextResponse.json({
      success: true,
      message: `Password reset successfully. New password is: ${phonePassword}`,
      user: {
        id: targetUser.id,
        name: `${targetUser.firstName} ${targetUser.lastName}`,
        phone: targetUser.phone
      }
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
