import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { chitSchemeSchema } from '@/lib/validations';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const schemes = await prisma.chitScheme.findMany({
      where: { isActive: true },
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ schemes });
  } catch (error: any) {
    console.error('Get chit schemes error:', error);
    
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
  try {
    const adminUser = await requireAuth(request, 'ADMIN');

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
    console.error('Create chit scheme error:', error);
    
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