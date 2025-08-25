import { NextRequest, NextResponse } from 'next/server';
import { prisma, generateRegistrationId } from '@/lib/database';
import { hashPassword, requireAuth } from '@/lib/auth';
import { registerUserSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const adminUser = await requireAuth(request, 'ADMIN');

    const body = await request.json();
    const userData = registerUserSchema.parse(body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Validate referrer if provided
    let referrerId = null;
    if (userData.referredBy) {
      const referrer = await prisma.user.findUnique({
        where: { registrationId: userData.referredBy },
        include: { referrals: true },
      });

      if (!referrer) {
        return NextResponse.json(
          { error: 'Invalid referrer registration ID' },
          { status: 400 }
        );
      }

      // Check if referrer has less than 3 direct referrals
      if (referrer.referrals.length >= 3) {
        return NextResponse.json(
          { error: 'Referrer has reached maximum referral limit (3)' },
          { status: 400 }
        );
      }

      referrerId = referrer.id;
    }

    const hashedPassword = await hashPassword(userData.password);
    const registrationId = generateRegistrationId();

    const newUser = await prisma.user.create({
      data: {
        registrationId,
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        address: userData.address,
        referredBy: referrerId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'USER_REGISTER',
        details: `Registered new user: ${newUser.registrationId}`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      user: {
        id: newUser.id,
        registrationId: newUser.registrationId,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phone: newUser.phone,
        address: newUser.address,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.message === 'Authentication required' || error.message === 'Insufficient permissions') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}