import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { comparePassword, generateToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import logger from '@/lib/logger';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);



    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      logger.error('Login failed - Invalid credentials or inactive user', new Error('Invalid credentials or inactive user'), {
        action: 'LOGIN_FAILED',
        ipAddress,
        userAgent,
        metadata: { email, userExists: !!user, isActive: user?.isActive }
      });
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      logger.error('Login failed - Invalid password', new Error('Invalid password'), {
        action: 'LOGIN_FAILED',
        userId: user.id,
        registrationId: user.registrationId,
        ipAddress,
        userAgent,
        metadata: { email }
      });
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: 'User logged in successfully',
        ipAddress: ipAddress,
        userAgent: userAgent,
      },
    });



    const response = NextResponse.json({
      user: {
        id: user.id,
        registrationId: user.registrationId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    });

    // Set cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error) {
    logger.error('Login error', error instanceof Error ? error : new Error(String(error)), {
      action: 'LOGIN_ERROR',
      ipAddress,
      userAgent,
      metadata: { responseTime: Date.now() - startTime }
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}