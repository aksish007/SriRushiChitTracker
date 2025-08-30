import { NextRequest, NextResponse } from 'next/server';
import { prisma, generateRegistrationId, generateSubscriberIdWithNumber } from '@/lib/database';
import { hashPassword, requireAuth } from '@/lib/auth';
import { parseExcelFile } from '@/lib/excel-utils';
import logger from '@/lib/logger';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Require admin authentication
    const adminUser = await requireAuth(request, 'ADMIN');

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const users = parseExcelFile(buffer);

    const results = [];
    const errors = [];

    for (let i = 0; i < users.length; i++) {
      const userData = users[i];
      
      try {
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: userData.email },
        });

        if (existingUser) {
          errors.push(`Row ${i + 2}: Email ${userData.email} already exists`);
          continue;
        }

        // Validate referrer if provided
        let referrerId = null;
        if (userData.referredBy) {
          const referrer = await prisma.user.findUnique({
            where: { registrationId: userData.referredBy },
            include: { referrals: true },
          });

          if (!referrer) {
            errors.push(`Row ${i + 2}: Invalid referrer registration ID ${userData.referredBy}`);
            continue;
          }

          if (referrer.referrals.length >= 3) {
            errors.push(`Row ${i + 2}: Referrer ${userData.referredBy} has reached maximum referral limit`);
            continue;
          }

          referrerId = referrer.id;
        }

        // Validate chit scheme if provided
        let chitSchemeId = null;
        if (userData.chitId) {
          const chitScheme = await prisma.chitScheme.findUnique({
            where: { chitId: userData.chitId },
          });

          if (!chitScheme) {
            errors.push(`Row ${i + 2}: Invalid chit ID ${userData.chitId}`);
            continue;
          }

          if (!chitScheme.isActive) {
            errors.push(`Row ${i + 2}: Chit scheme ${userData.chitId} is not active`);
            continue;
          }

          chitSchemeId = chitScheme.id;
        }

        const hashedPassword = await hashPassword(String(userData.phone)); // Use mobile number as password
        const registrationId = generateRegistrationId();

        const newUser = await prisma.user.create({
          data: {
            registrationId,
            email: userData.email,
            password: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: String(userData.phone), // Ensure phone is always a string
            address: userData.address,
            referredBy: referrerId,
          },
        });

        // Create subscription if chit ID is provided
        if (chitSchemeId) {
          const chitScheme = await prisma.chitScheme.findUnique({
            where: { id: chitSchemeId },
          });
          if (chitScheme) {
            const subscriberId = await generateSubscriberIdWithNumber(chitScheme.chitId);
            await prisma.chitSubscription.create({
              data: {
                subscriberId,
                userId: newUser.id,
                chitSchemeId,
                status: 'ACTIVE',
              },
            });
          }
        }

        results.push({
          registrationId: newUser.registrationId,
          email: newUser.email,
          name: `${newUser.firstName} ${newUser.lastName}`,
        });
      } catch (error) {
        logger.error(`Error processing row ${i + 2}`, error instanceof Error ? error : new Error(String(error)), {
          action: 'BULK_UPLOAD_ROW_ERROR',
          userId: adminUser.id,
          registrationId: adminUser.registrationId,
          ipAddress,
          userAgent,
          metadata: {
            row: i + 2,
            userData,
            errorMessage: error instanceof Error ? error.message : String(error)
          }
        });
        errors.push(`Row ${i + 2}: Failed to create user - ${error}`);
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'BULK_USER_UPLOAD',
        details: `Bulk uploaded ${results.length} users with ${errors.length} errors`,
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
    logger.error('Bulk upload error', error instanceof Error ? error : new Error(String(error)), {
      action: 'BULK_UPLOAD_ERROR',
      userId: adminUser?.id,
      registrationId: adminUser?.registrationId,
      ipAddress,
      userAgent,
      metadata: {
        endpoint: '/api/users/bulk-upload',
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