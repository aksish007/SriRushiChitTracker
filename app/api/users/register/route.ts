import { NextRequest, NextResponse } from 'next/server';
import { prisma, generateRegistrationId } from '@/lib/database';
import { hashPassword, requireAuth } from '@/lib/auth';
import { registerUserSchema } from '@/lib/validations';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const adminUser = await requireAuth(request, 'ADMIN');

    const body = await request.json();
    const userData = registerUserSchema.parse(body);

    // Check if phone already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: userData.phone },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Phone number already exists' },
        { status: 400 }
      );
    }

    // Check if email already exists (if provided)
    if (userData.email && userData.email.trim()) {
      const existingEmailUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingEmailUser) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Validate referrer if provided
    let referrerId = null;
    if (userData.referredBy) {
      const referrer = await prisma.user.findUnique({
        where: { id: userData.referredBy },
        include: { referrals: true },
      });

      if (!referrer) {
        return NextResponse.json(
          { error: 'Invalid referrer ID' },
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
    const registrationId = await generateRegistrationId();

    const newUser = await prisma.user.create({
      data: {
        registrationId,
        email: userData.email && userData.email.trim() ? userData.email : null,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        address: userData.address,
        referredBy: referrerId,
        nominees: userData.nominee && (userData.nominee.name || userData.nominee.relation || userData.nominee.age || userData.nominee.dateOfBirth) ? {
          create: {
            name: userData.nominee.name || '',
            relation: userData.nominee.relation || '',
            age: userData.nominee.age || null,
            dateOfBirth: userData.nominee.dateOfBirth ? new Date(userData.nominee.dateOfBirth) : null,
          }
        } : undefined,
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

    // Fetch the created user with nominee data
    const userWithNominee = await prisma.user.findUnique({
      where: { id: newUser.id },
      include: { nominees: true },
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
        nominees: userWithNominee?.nominees || [],
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