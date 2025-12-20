#!/usr/bin/env tsx
/**
 * Production User Import Script
 * 
 * This script imports users with proper referral mappings and subscriptions
 * Supports HTML files (from referral tree export) and can be extended for CSV/Excel
 * 
 * Usage:
 *   For HTML: npx tsx import-users-production.ts <html-file-path>
 *   For CSV/Excel: npx tsx import-users-production.ts <file-path> --format csv|excel
 */

import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { prisma, generateSubscriberIdWithNumber } from './lib/database';
import { hashPassword } from './lib/auth';
import { USER_ROLES, SUBSCRIPTION_STATUS } from './lib/constants';
import { parseExcelFile } from './lib/excel-utils';

interface ParsedUser {
  name: string;
  registrationId: string;
  email: string | null;
  phone: string;
  address?: string;
  referredByRegistrationId: string | null;
  subscriptions: ParsedSubscription[];
}

interface ParsedSubscription {
  chitSchemeName: string;
  chitId: string;
  amount: number;
  duration: number;
  status: string;
  subscriberNumber?: number;
}

interface ParsedChitScheme {
  chitId: string;
  name: string;
  amount: number;
  duration: number;
}

function parseAmount(amountStr: string): number {
  // Remove ₹, commas, and spaces, then parse
  const cleaned = amountStr.replace(/[₹,\s]/g, '');
  return parseFloat(cleaned) || 0;
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(' ');
  return { firstName, lastName };
}

function extractRegistrationId(text: string): string | null {
  const match = text.match(/SRC-\d{5}/);
  return match ? match[0] : null;
}

async function parseHTMLFile(filePath: string): Promise<{
  users: ParsedUser[];
  chitSchemes: Map<string, ParsedChitScheme>;
}> {
  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html);

  const users: ParsedUser[] = [];
  const chitSchemesMap = new Map<string, ParsedChitScheme>();

  // Find all tree-item divs
  $('.tree-item').each((_, element) => {
    const $item = $(element);
    
    // Extract user name and registration ID
    const nameElement = $item.find('strong').first();
    const name = nameElement.text().trim();
    
    const registrationIdElement = $item.find('span').filter((_, el) => {
      return $(el).text().match(/^SRC-\d{5}$/);
    }).first();
    const registrationId = registrationIdElement.text().trim();

    if (!name || !registrationId) {
      return; // Skip if essential data is missing
    }

    // Extract email
    let email: string | null = null;
    $item.find('div').each((_, div) => {
      const text = $(div).text();
      if (text.includes('Email:')) {
        const emailMatch = text.match(/Email:\s*(.+)/);
        if (emailMatch && emailMatch[1] && emailMatch[1].trim() !== 'N/A') {
          email = emailMatch[1].trim();
        }
      }
    });

    // Extract phone
    let phone = '';
    $item.find('div').each((_, div) => {
      const text = $(div).text();
      if (text.includes('Phone:')) {
        const phoneMatch = text.match(/Phone:\s*(\d+)/);
        if (phoneMatch && phoneMatch[1]) {
          phone = phoneMatch[1].trim();
        }
      }
    });

    // Extract address if available
    let address: string | undefined = undefined;
    $item.find('div').each((_, div) => {
      const text = $(div).text();
      if (text.includes('Address:')) {
        const addressMatch = text.match(/Address:\s*(.+)/);
        if (addressMatch && addressMatch[1] && addressMatch[1].trim() !== 'N/A') {
          address = addressMatch[1].trim();
        }
      }
    });

    // Extract referred by
    let referredByRegistrationId: string | null = null;
    $item.find('div').each((_, div) => {
      const text = $(div).text();
      if (text.includes('Referred By:')) {
        const refId = extractRegistrationId(text);
        if (refId) {
          referredByRegistrationId = refId;
        }
      }
    });

    // Extract subscriptions
    const subscriptions: ParsedSubscription[] = [];
    $item.find('div').each((_, div) => {
      const $div = $(div);
      const text = $div.text();
      
      // Look for chit group sections
      if (text.includes('Chit Groups') && !text.match(/^Chit Groups \(\d+\):/)) {
        $div.find('div').each((_, subDiv) => {
          const $subDiv = $(subDiv);
          const subText = $subDiv.text();
          
          if (subText.includes('Chit Groups') && !subText.includes('₹')) {
            return;
          }
          
          // Extract chit scheme name and ID
          const nameMatch = subText.match(/(.+?)\s*\(([A-Z0-9-]+)\)/);
          if (nameMatch && nameMatch[2].length >= 4) {
            const chitSchemeName = nameMatch[1].trim();
            const chitId = nameMatch[2].trim();
            
            if (chitSchemeName.toLowerCase().includes('chit groups')) {
              return;
            }
            
            // Extract amount, duration, status, and subscriber number
            const detailsMatch = subText.match(/₹([\d,]+).*?(\d+)\s+months.*?(ACTIVE|COMPLETED|CANCELLED)/i);
            const subscriberMatch = subText.match(/Subscriber[:\s]+(\d+)/i);
            
            if (detailsMatch) {
              const amount = parseAmount(detailsMatch[1]);
              const duration = parseInt(detailsMatch[2]) || 0;
              const status = detailsMatch[3].toUpperCase();
              const subscriberNumber = subscriberMatch ? parseInt(subscriberMatch[1]) : undefined;
              
              subscriptions.push({
                chitSchemeName,
                chitId,
                amount,
                duration,
                status,
                subscriberNumber,
              });

              // Store chit scheme info
              if (!chitSchemesMap.has(chitId)) {
                chitSchemesMap.set(chitId, {
                  chitId,
                  name: chitSchemeName,
                  amount,
                  duration,
                });
              }
            }
          }
        });
      }
    });

    users.push({
      name,
      registrationId,
      email,
      phone: phone || '0000000000',
      address,
      referredByRegistrationId,
      subscriptions,
    });
  });

  return { users, chitSchemes: chitSchemesMap };
}

async function main() {
  const filePath = process.argv[2];
  const format = process.argv[3] === '--format' ? process.argv[4] : 'html';
  
  if (!filePath) {
    console.error('❌ Usage: npx tsx import-users-production.ts <file-path> [--format html|csv|excel]');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  console.log('🚀 Starting production user import...\n');
  console.log(`📄 File: ${filePath}`);
  console.log(`📋 Format: ${format}\n`);

  let users: ParsedUser[] = [];
  let chitSchemes: Map<string, ParsedChitScheme> = new Map();

  // Parse file based on format
  if (format === 'html' || path.extname(filePath).toLowerCase() === '.html') {
    console.log('📄 Parsing HTML file...');
    const parsed = await parseHTMLFile(filePath);
    users = parsed.users;
    chitSchemes = parsed.chitSchemes;
  } else if (format === 'excel' || path.extname(filePath).toLowerCase().match(/\.(xlsx|xls)$/)) {
    console.log('📊 Parsing Excel file...');
    const buffer = fs.readFileSync(filePath);
    const excelUsers = parseExcelFile(buffer);
    
    // Convert Excel format to ParsedUser format
    // Note: Excel format may need adjustment based on your actual Excel structure
    users = excelUsers.map((excelUser, index) => ({
      name: `${excelUser.firstName} ${excelUser.lastName}`,
      registrationId: '', // Will be generated
      email: excelUser.email || null,
      phone: excelUser.phone,
      address: excelUser.address,
      referredByRegistrationId: excelUser.referredBy || null,
      subscriptions: excelUser.chitId ? [{
        chitSchemeName: '',
        chitId: excelUser.chitId,
        amount: 0,
        duration: 0,
        status: 'ACTIVE',
      }] : [],
    }));
    
    console.log('⚠️  Excel import may need custom mapping. Please verify the data structure.');
  } else {
    console.error(`❌ Unsupported format: ${format}`);
    console.error('   Supported formats: html, excel');
    process.exit(1);
  }

  console.log(`✅ Parsed ${users.length} users and ${chitSchemes.size} chit schemes\n`);

  // Create a map of registrationId -> userId for referral relationships
  const registrationIdToUserId = new Map<string, string>();

  // Only use existing chit schemes from prod-seed - DO NOT create new ones
  console.log('📦 Mapping to existing chit schemes...');
  const chitSchemeIdMap = new Map<string, string>(); // chitId -> chitSchemeId
  
  // Get all existing chit schemes from database
  const existingSchemes = await prisma.chitScheme.findMany({
    select: { id: true, chitId: true, name: true },
  });
  
  console.log(`  Found ${existingSchemes.length} existing chit schemes in database`);
  
  // Map existing schemes
  for (const scheme of existingSchemes) {
    chitSchemeIdMap.set(scheme.chitId, scheme.id);
    console.log(`  ✓ ${scheme.chitId}: ${scheme.name}`);
  }
  
  // Check if any parsed schemes from HTML don't exist
  const missingSchemes: string[] = [];
  for (const [chitId] of chitSchemes.entries()) {
    if (!chitSchemeIdMap.has(chitId)) {
      missingSchemes.push(chitId);
    }
  }
  
  if (missingSchemes.length > 0) {
    console.log(`\n  ⚠️  Warning: ${missingSchemes.length} chit schemes from HTML not found in database:`);
    missingSchemes.forEach(id => console.log(`     - ${id}`));
    console.log(`  These subscriptions will be skipped.\n`);
  }

  // Create users in order (handle referrals)
  console.log('\n👥 Creating/updating users...');
  const defaultPassword = await hashPassword('TempPass123!');
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (const userData of users) {
    try {
      // Check if user already exists by registrationId
      let existing = null;
      if (userData.registrationId) {
        existing = await prisma.user.findUnique({
          where: { registrationId: userData.registrationId },
        });
      }

      // Also check by phone if registrationId not found
      if (!existing && userData.phone && userData.phone !== '0000000000') {
        existing = await prisma.user.findUnique({
          where: { phone: userData.phone },
        });
      }

      if (existing) {
        console.log(`  ⏭️  User ${userData.registrationId || userData.phone} already exists`);
        registrationIdToUserId.set(userData.registrationId || existing.registrationId, existing.id);
        skippedCount++;
        continue;
      }

      // Find referrer user ID if referredBy is set
      let referredByUserId: string | undefined = undefined;
      if (userData.referredByRegistrationId) {
        referredByUserId = registrationIdToUserId.get(userData.referredByRegistrationId);
        if (!referredByUserId) {
          // Try to find in database
          const referrer = await prisma.user.findUnique({
            where: { registrationId: userData.referredByRegistrationId },
            select: { id: true },
          });
          if (referrer) {
            referredByUserId = referrer.id;
            registrationIdToUserId.set(userData.referredByRegistrationId, referrer.id);
            console.log(`  🔗 Found referrer: ${userData.referredByRegistrationId}`);
          } else {
            console.log(`  ⚠️  Referrer ${userData.referredByRegistrationId} not found - user will be created without referrer`);
          }
        }
      }

      const { firstName, lastName } = parseName(userData.name);

      // Generate registration ID if not provided
      let registrationId = userData.registrationId;
      if (!registrationId) {
        const { generateRegistrationId } = await import('./lib/database');
        registrationId = await generateRegistrationId();
      }

      // Check phone uniqueness
      let phone = userData.phone || '0000000000';
      if (phone === '0000000000') {
        // Generate a unique phone if not provided
        let phoneNum = 9000000000;
        while (await prisma.user.findUnique({ where: { phone: phoneNum.toString() } })) {
          phoneNum++;
        }
        phone = phoneNum.toString();
      } else {
        // Check if phone already exists
        const phoneExists = await prisma.user.findUnique({
          where: { phone },
        });
        if (phoneExists) {
          console.log(`  ⚠️  Phone ${phone} already exists - skipping user ${userData.name}`);
          skippedCount++;
          continue;
        }
      }

      const user = await prisma.user.create({
        data: {
          registrationId,
          email: userData.email,
          password: defaultPassword,
          firstName,
          lastName,
          phone,
          address: userData.address,
          role: USER_ROLES.USER,
          isActive: true,
          referredBy: referredByUserId,
        },
      });

      registrationIdToUserId.set(registrationId, user.id);
      console.log(`  ✅ Created user: ${userData.name} (${registrationId})`);
      createdCount++;
    } catch (error: any) {
      console.error(`  ❌ Error creating user ${userData.registrationId || userData.name}:`, error.message);
      if (error.code === 'P2002') {
        console.error(`     Duplicate entry - user may already exist`);
      }
    }
  }

  // Create subscriptions
  console.log('\n📋 Creating subscriptions...');
  let subscriptionCount = 0;
  let subscriptionSkipped = 0;

  for (const userData of users) {
    const registrationId = userData.registrationId;
    const userId = registrationIdToUserId.get(registrationId);
    if (!userId) {
      console.log(`  ⚠️  Skipping subscriptions for ${registrationId} - user not found`);
      continue;
    }

    for (const subscription of userData.subscriptions) {
      try {
        const chitSchemeId = chitSchemeIdMap.get(subscription.chitId);
        if (!chitSchemeId) {
          // Try to find chit scheme in database
          const existingScheme = await prisma.chitScheme.findUnique({
            where: { chitId: subscription.chitId },
          });
          if (!existingScheme) {
            console.log(`  ⚠️  Skipping subscription - chit scheme ${subscription.chitId} not found`);
            continue;
          }
          chitSchemeIdMap.set(subscription.chitId, existingScheme.id);
        }

        // Check if subscription already exists
        const existingSub = await prisma.chitSubscription.findFirst({
          where: {
            userId,
            chitSchemeId: chitSchemeIdMap.get(subscription.chitId),
          },
        });

        if (existingSub) {
          console.log(`  ⏭️  Subscription already exists for ${registrationId} in ${subscription.chitId}`);
          subscriptionSkipped++;
          continue;
        }

        // Generate subscriber ID (use provided number if available)
        const subscriberId = subscription.subscriberNumber
          ? await generateSubscriberIdWithNumber(subscription.chitId, subscription.subscriberNumber)
          : await generateSubscriberIdWithNumber(subscription.chitId);

        await prisma.chitSubscription.create({
          data: {
            subscriberId,
            userId,
            chitSchemeId: chitSchemeIdMap.get(subscription.chitId)!,
            status: subscription.status === 'ACTIVE' ? SUBSCRIPTION_STATUS.ACTIVE :
                   subscription.status === 'COMPLETED' ? SUBSCRIPTION_STATUS.COMPLETED :
                   SUBSCRIPTION_STATUS.CANCELLED,
          },
        });

        subscriptionCount++;
        console.log(`  ✅ Created subscription: ${registrationId} -> ${subscription.chitSchemeName || subscription.chitId} (${subscriberId})`);
      } catch (error: any) {
        console.error(`  ❌ Error creating subscription for ${registrationId}:`, error.message);
      }
    }
  }

  console.log('\n✅ Import completed!');
  console.log(`\n📊 Summary:`);
  console.log(`- Users created: ${createdCount}`);
  console.log(`- Users skipped (already exist): ${skippedCount}`);
  console.log(`- Chit Schemes: ${chitSchemes.size}`);
  console.log(`- Subscriptions created: ${subscriptionCount}`);
  console.log(`- Subscriptions skipped: ${subscriptionSkipped}`);
  console.log(`\n⚠️  Default password for all users: TempPass123!`);
  console.log(`   Users should change their password on first login.`);
}

main()
  .catch((e) => {
    console.error('❌ Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

