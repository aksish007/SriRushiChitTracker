import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const user = await authenticateRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Return user data if token is valid
    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        registrationId: user.registrationId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (error: any) {
    console.error('Token validation error:', error);
    
    return NextResponse.json(
      { error: 'Token validation failed' },
      { status: 401 }
    );
  }
}
