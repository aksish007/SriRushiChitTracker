import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import logger from '@/lib/logger';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const user = await requireAuth(request);
    

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { registrationId: { contains: search } },
      ];
    }

    if (role && role !== 'all') {
      where.role = role;
    }

    if (status && status !== 'all') {
      where.isActive = status === 'true';
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortField === 'firstName' || sortField === 'lastName') {
      orderBy[sortField] = sortOrder;
    } else if (sortField === 'registrationId') {
      orderBy.registrationId = sortOrder;
    } else if (sortField === 'email') {
      orderBy.email = sortOrder;
    } else if (sortField === 'role') {
      orderBy.role = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          registrationId: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          address: true,
          role: true,
          isActive: true,
          createdAt: true,
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
            select: {
              id: true,
              subscriberId: true,
              status: true,
              chitScheme: {
                select: {
                  name: true,
                  amount: true,
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);



    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    logger.error('Users API - GET error', error instanceof Error ? error : new Error(String(error)), {
      action: 'USERS_API_GET_ERROR',
      userId: user?.id,
      registrationId: user?.registrationId,
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/users',
        method: 'GET',
        responseTime,
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