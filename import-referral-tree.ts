import * as cheerio from 'cheerio';
import * as fs from 'fs';
import { prisma, generateSubscriberIdWithNumber } from './lib/database';
import { hashPassword } from './lib/auth';
import { USER_ROLES, SUBSCRIPTION_STATUS } from './lib/constants';

interface ParsedUser {
  name: string;
  registrationId: string;
  email: string | null;
  phone: string;
  referredByRegistrationId: string | null;
  subscriptions: ParsedSubscription[];
}

interface ParsedSubscription {
  chitSchemeName: string;
  chitId: string;
  amount: number;
  duration: number;
  status: string;
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
      
      // Look for chit group sections - but skip the header text
      if (text.includes('Chit Groups') && !text.match(/^Chit Groups \(\d+\):/)) {
        // Find the nested divs that contain actual chit scheme info
        $div.find('div').each((_, subDiv) => {
          const $subDiv = $(subDiv);
          const subText = $subDiv.text();
          
          // Skip if this is the header or container text
          if (subText.includes('Chit Groups') && !subText.includes('₹')) {
            return;
          }
          
          // Extract chit scheme name and ID - look for pattern like "NAME (ID)"
          const nameMatch = subText.match(/(.+?)\s*\(([A-Z0-9]+)\)/);
          if (nameMatch && nameMatch[2].length >= 4) { // Valid chit ID should be at least 4 chars
            const chitSchemeName = nameMatch[1].trim();
            const chitId = nameMatch[2].trim();
            
            // Skip if name is just "Chit Groups" or similar
            if (chitSchemeName.toLowerCase().includes('chit groups')) {
              return;
            }
            
            // Extract amount, duration, and status
            const detailsMatch = subText.match(/₹([\d,]+).*?(\d+)\s+months.*?(ACTIVE|COMPLETED|CANCELLED)/i);
            if (detailsMatch) {
              const amount = parseAmount(detailsMatch[1]);
              const duration = parseInt(detailsMatch[2]) || 0;
              const status = detailsMatch[3].toUpperCase();
              
              subscriptions.push({
                chitSchemeName,
                chitId,
                amount,
                duration,
                status,
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
      phone: phone || '0000000000', // Default phone if missing
      referredByRegistrationId,
      subscriptions,
    });
  });

  return { users, chitSchemes: chitSchemesMap };
}

async function main() {
  const htmlFilePath = process.argv[2] || '/Users/subhadip/Downloads/referral-tree-SRC-00015-2025-11-23.html';
  
  if (!fs.existsSync(htmlFilePath)) {
    console.error(`❌ File not found: ${htmlFilePath}`);
    process.exit(1);
  }

  console.log('📄 Parsing HTML file...');
  const { users, chitSchemes } = await parseHTMLFile(htmlFilePath);
  
  console.log(`✅ Parsed ${users.length} users and ${chitSchemes.size} chit schemes`);

  // Create a map of registrationId -> userId for referral relationships
  const registrationIdToUserId = new Map<string, string>();

  // First, create all chit schemes
  console.log('\n📦 Creating chit schemes...');
  const chitSchemeIdMap = new Map<string, string>(); // chitId -> chitSchemeId
  
  for (const [chitId, scheme] of chitSchemes.entries()) {
    try {
      // Check if chit scheme already exists
      const existing = await prisma.chitScheme.findUnique({
        where: { chitId },
      });

      if (existing) {
        console.log(`  ⏭️  Chit scheme ${chitId} already exists`);
        chitSchemeIdMap.set(chitId, existing.id);
      } else {
        // Estimate totalSlots based on duration (rough estimate)
        const totalSlots = scheme.duration;
        
        const created = await prisma.chitScheme.create({
          data: {
            chitId: scheme.chitId,
            name: scheme.name,
            amount: scheme.amount,
            duration: scheme.duration,
            totalSlots,
            isActive: true,
          },
        });
        console.log(`  ✅ Created chit scheme: ${scheme.name} (${chitId})`);
        chitSchemeIdMap.set(chitId, created.id);
      }
    } catch (error) {
      console.error(`  ❌ Error creating chit scheme ${chitId}:`, error);
    }
  }

  // Create users in order (handle referrals)
  console.log('\n👥 Creating users...');
  const defaultPassword = await hashPassword('TempPass123!');
  
  for (const userData of users) {
    try {
      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { registrationId: userData.registrationId },
      });

      if (existing) {
        console.log(`  ⏭️  User ${userData.registrationId} already exists`);
        registrationIdToUserId.set(userData.registrationId, existing.id);
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
          }
        }
      }

      const { firstName, lastName } = parseName(userData.name);

      const user = await prisma.user.create({
        data: {
          registrationId: userData.registrationId,
          email: userData.email,
          password: defaultPassword,
          firstName,
          lastName,
          phone: userData.phone,
          role: USER_ROLES.USER,
          isActive: true,
          referredBy: referredByUserId,
        },
      });

      registrationIdToUserId.set(userData.registrationId, user.id);
      console.log(`  ✅ Created user: ${userData.name} (${userData.registrationId})`);
    } catch (error) {
      console.error(`  ❌ Error creating user ${userData.registrationId}:`, error);
    }
  }

  // Create subscriptions
  console.log('\n📋 Creating subscriptions...');
  let subscriptionCount = 0;

  for (const userData of users) {
    const userId = registrationIdToUserId.get(userData.registrationId);
    if (!userId) {
      console.log(`  ⚠️  Skipping subscriptions for ${userData.registrationId} - user not found`);
      continue;
    }

    for (const subscription of userData.subscriptions) {
      try {
        const chitSchemeId = chitSchemeIdMap.get(subscription.chitId);
        if (!chitSchemeId) {
          console.log(`  ⚠️  Skipping subscription - chit scheme ${subscription.chitId} not found`);
          continue;
        }

        // Check if subscription already exists
        const existingSub = await prisma.chitSubscription.findFirst({
          where: {
            userId,
            chitSchemeId,
          },
        });

        if (existingSub) {
          console.log(`  ⏭️  Subscription already exists for ${userData.registrationId} in ${subscription.chitId}`);
          continue;
        }

        // Generate subscriber ID
        const subscriberId = await generateSubscriberIdWithNumber(subscription.chitId);

        await prisma.chitSubscription.create({
          data: {
            subscriberId,
            userId,
            chitSchemeId,
            status: subscription.status === 'ACTIVE' ? SUBSCRIPTION_STATUS.ACTIVE :
                   subscription.status === 'COMPLETED' ? SUBSCRIPTION_STATUS.COMPLETED :
                   SUBSCRIPTION_STATUS.CANCELLED,
          },
        });

        subscriptionCount++;
        console.log(`  ✅ Created subscription: ${userData.registrationId} -> ${subscription.chitSchemeName} (${subscription.chitId})`);
      } catch (error) {
        console.error(`  ❌ Error creating subscription for ${userData.registrationId}:`, error);
      }
    }
  }

  console.log('\n✅ Import completed!');
  console.log(`\n📊 Summary:`);
  console.log(`- Users: ${users.length}`);
  console.log(`- Chit Schemes: ${chitSchemes.size}`);
  console.log(`- Subscriptions: ${subscriptionCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

