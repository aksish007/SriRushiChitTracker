import { NextRequest, NextResponse } from 'next/server';
import { prisma, generateSubscriberIdWithNumber, validateSubscriberIdFormat, extractChitIdFromSubscriberId } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAuth(request, 'ADMIN');

    const body = await request.json();
    const { subscriberIds, userId } = body;

    if (!subscriberIds || !Array.isArray(subscriberIds)) {
      return NextResponse.json(
        { error: 'Subscriber IDs array is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < subscriberIds.length; i++) {
      const subscriberId = subscriberIds[i];
      
      try {
        // Validate subscriber ID format
        if (!validateSubscriberIdFormat(subscriberId)) {
          errors.push(`Row ${i + 1}: Invalid subscriber ID format: ${subscriberId}`);
          continue;
        }

        // Extract chit ID from subscriber ID
        const chitId = extractChitIdFromSubscriberId(subscriberId);
        if (!chitId) {
          errors.push(`Row ${i + 1}: Could not extract chit ID from: ${subscriberId}`);
          continue;
        }

        // Find chit scheme
        const chitScheme = await prisma.chitScheme.findUnique({
          where: { chitId },
        });

        if (!chitScheme) {
          errors.push(`Row ${i + 1}: Chit scheme not found: ${chitId}`);
          continue;
        }

        if (!chitScheme.isActive) {
          errors.push(`Row ${i + 1}: Chit scheme is not active: ${chitId}`);
          continue;
        }

        // Check if user already subscribed to this scheme
        const existingSubscription = await prisma.chitSubscription.findFirst({
          where: {
            userId,
            chitSchemeId: chitScheme.id,
            status: 'ACTIVE',
          },
        });

        if (existingSubscription) {
          errors.push(`Row ${i + 1}: User already subscribed to chit scheme: ${chitId}`);
          continue;
        }

        // Check if subscriber ID already exists
        const existingSubscriberId = await prisma.chitSubscription.findUnique({
          where: { subscriberId },
        });

        if (existingSubscriberId) {
          errors.push(`Row ${i + 1}: Subscriber ID already exists: ${subscriberId}`);
          continue;
        }

        // Check if scheme has available slots
        const activeSubscriptions = await prisma.chitSubscription.count({
          where: {
            chitSchemeId: chitScheme.id,
            status: 'ACTIVE',
          },
        });

        if (activeSubscriptions >= chitScheme.totalSlots) {
          errors.push(`Row ${i + 1}: Chit scheme is full: ${chitId}`);
          continue;
        }

        // Create subscription
        const newSubscription = await prisma.chitSubscription.create({
          data: {
            subscriberId,
            userId,
            chitSchemeId: chitScheme.id,
          },
          include: {
            user: {
              select: {
                registrationId: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            chitScheme: true,
          },
        });

        results.push({
          subscriberId: newSubscription.subscriberId,
          chitScheme: newSubscription.chitScheme.name,
          user: `${newSubscription.user.firstName} ${newSubscription.user.lastName}`,
        });

      } catch (error) {
        console.error(`Error processing subscriber ID ${subscriberId}:`, error);
        errors.push(`Row ${i + 1}: Failed to create subscription - ${error}`);
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'BULK_SUBSCRIPTION_IMPORT',
        details: `Bulk imported ${results.length} subscriptions with ${errors.length} errors for user: ${user.registrationId}`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: results.length,
      errors: errors.length,
      results,
      errorDetails: errors,
    });

  } catch (error: any) {
    console.error('Bulk import error:', error);
    
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
