import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { chitSchemeSchema } from '@/lib/validations';
import logger from '@/lib/logger';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  let user: any = null;

  try {
    user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { chitId: { contains: search } },
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (status && status !== 'all') {
      where.isActive = status === 'true';
    }

    // Build orderBy clause - default to amount asc, then duration asc
    let orderBy: any[] = [];
    
    if (sortField === 'name') {
      orderBy = [{ name: sortOrder }];
    } else if (sortField === 'amount') {
      orderBy = [{ amount: sortOrder }];
    } else if (sortField === 'duration') {
      orderBy = [{ duration: sortOrder }];
    } else if (sortField === 'totalSlots') {
      orderBy = [{ totalSlots: sortOrder }];
    } else if (sortField === 'chitId') {
      orderBy = [{ chitId: sortOrder }];
    } else if (sortField === 'createdAt') {
      orderBy = [{ createdAt: sortOrder }];
    } else {
      // Default sorting: amount asc, then duration asc
      orderBy = [
        { amount: 'asc' },
        { duration: 'asc' }
      ];
    }

    const [schemes, total] = await Promise.all([
      prisma.chitScheme.findMany({
        where,
        include: {
          subscriptions: {
            select: {
              id: true,
              subscriberId: true,
              status: true,
              user: {
                select: {
                  registrationId: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.chitScheme.count({ where }),
    ]);

    return NextResponse.json({ 
      schemes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    logger.error('Get chit schemes error', error instanceof Error ? error : new Error(String(error)), {
      action: 'CHIT_SCHEMES_API_GET_ERROR',
      userId: user?.id,
      registrationId: user?.registrationId,
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/chit-schemes',
        method: 'GET',
        errorMessage: error.message
      }
    });
    
    if (error.message === 'Authentication required') {
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

export async function POST(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  let adminUser: any = null;

  try {
    adminUser = await requireAuth(request, 'ADMIN');

    const body = await request.json();
    const schemeData = chitSchemeSchema.parse(body);

    // Check if chitId already exists
    const existingScheme = await prisma.chitScheme.findUnique({
      where: { chitId: schemeData.chitId },
    });

    if (existingScheme) {
      return NextResponse.json(
        { error: 'Chit ID already exists' },
        { status: 400 }
      );
    }

    const newScheme = await prisma.chitScheme.create({
      data: {
        chitId: schemeData.chitId,
        name: schemeData.name,
        amount: schemeData.amount,
        duration: schemeData.duration,
        totalSlots: schemeData.totalSlots,
        description: schemeData.description,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'CHIT_SCHEME_CREATE',
        details: `Created chit scheme: ${newScheme.chitId}`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({ scheme: newScheme });
  } catch (error: any) {
    logger.error('Create chit scheme error', error instanceof Error ? error : new Error(String(error)), {
      action: 'CHIT_SCHEMES_API_POST_ERROR',
      userId: adminUser?.id,
      registrationId: adminUser?.registrationId,
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/chit-schemes',
        method: 'POST',
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