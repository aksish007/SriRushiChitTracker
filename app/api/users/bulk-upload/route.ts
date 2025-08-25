import { NextRequest, NextResponse } from 'next/server';
import { prisma, generateRegistrationId } from '@/lib/database';
import { hashPassword, requireAuth } from '@/lib/auth';
import { parseExcelFile } from '@/lib/excel-utils';

export async function POST(request: NextRequest) {
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

        const hashedPassword = await hashPassword('defaultPassword123'); // Default password
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

        results.push({
          registrationId: newUser.registrationId,
          email: newUser.email,
          name: `${newUser.firstName} ${newUser.lastName}`,
        });
      } catch (error) {
        console.error(`Error processing row ${i + 2}:`, error);
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
    console.error('Bulk upload error:', error);
    
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