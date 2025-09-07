import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import logger from '@/lib/logger';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  let user;
  let searchParams;
  try {
    // Require authentication
    user = await requireAuth(request);

    searchParams = new URL(request.url).searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Search users by registration ID, first name, or last name
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { registrationId: { contains: query } },
          { firstName: { contains: query } },
          { lastName: { contains: query } },
        ],
      },
      select: {
        id: true,
        registrationId: true,
        firstName: true,
        lastName: true,
        referrals: {
          select: {
            id: true,
          }
        }
      },
      take: limit,
      orderBy: {
        registrationId: 'asc'
      }
    });

    // Filter users who can refer (have less than 3 referrals)
    const eligibleReferrers = users.filter(user => user.referrals.length < 3);

    return NextResponse.json({ users: eligibleReferrers });
  } catch (error: any) {
    logger.error('User search error', error instanceof Error ? error : new Error(String(error)), {
      action: 'USER_SEARCH_ERROR',
      userId: user?.id,
      registrationId: user?.registrationId,
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/users/search',
        method: 'GET',
        query: searchParams?.get('q'),
        errorMessage: error.message
      }
    });
    
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