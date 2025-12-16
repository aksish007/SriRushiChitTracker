import { prisma, generateRegistrationId, generateSubscriberIdWithNumber, getOrCreateOrganizationUser } from './lib/database';
import { hashPassword } from './lib/auth';
import { USER_ROLES, SUBSCRIPTION_STATUS, PAYOUT_STATUS } from './lib/constants';

async function main() {
  console.log('🌱 Starting seed...');

  // Create organization user first (for automatic chit scheme subscriptions)
  const orgUser = await getOrCreateOrganizationUser();
  console.log(`✅ Organization user ready: ${orgUser.registrationId}`);

  // Create admin user (check if already exists by email)
  let admin = await prisma.user.findFirst({
    where: {
      email: 'admin@sriruschichits.com'
    }
  });

  if (!admin) {
    // Check if phone number is available
    const phoneExists = await prisma.user.findFirst({
      where: { phone: '9876543210' }
    });

    const adminPassword = await hashPassword('admin123');
    const adminRegId = await generateRegistrationId();
    
    // Use a different phone if the default one is taken
    let adminPhone = '9876543210';
    if (phoneExists) {
      // Find an available phone number
      let phoneNum = 9876543200;
      while (await prisma.user.findFirst({ where: { phone: phoneNum.toString() } })) {
        phoneNum--;
      }
      adminPhone = phoneNum.toString();
      console.log(`⚠️  Default phone taken, using: ${adminPhone}`);
    }
    
    admin = await prisma.user.create({
      data: {
        registrationId: adminRegId,
        email: 'admin@sriruschichits.com',
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        phone: adminPhone,
        address: 'Admin Office, City',
        role: USER_ROLES.ADMIN,
      },
    });
    console.log(`✅ Created admin user: ${admin.registrationId}`);
  } else {
    console.log(`⚠️  Admin user already exists: ${admin.registrationId}`);
  }

  // Create regular user (check if already exists)
  let user = await prisma.user.findFirst({
    where: {
      email: 'user@sriruschichits.com'
    }
  });

  if (!user) {
    const userPassword = await hashPassword('user123');
    const userRegId = await generateRegistrationId();
    
    user = await prisma.user.create({
      data: {
        registrationId: userRegId,
        email: 'user@sriruschichits.com',
        password: userPassword,
        firstName: 'John',
        lastName: 'Doe',
        phone: '9876543211',
        address: '123 Main Street, City',
        role: USER_ROLES.USER,
      },
    });
    console.log(`✅ Created regular user: ${user.registrationId}`);
  } else {
    console.log(`⚠️  Regular user already exists: ${user.registrationId}`);
  }

  // Create some referral users (only if regular user exists)
  const referralUsers = [];
  if (user) {
    for (let i = 1; i <= 5; i++) {
      // Check if user already exists by email or phone
      const existingRefUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: `user${i}@example.com` },
            { phone: `987654321${i}` }
          ]
        }
      });

      if (!existingRefUser) {
        const refPassword = await hashPassword('user123');
        const refRegId = await generateRegistrationId();
        
        const refUser = await prisma.user.create({
          data: {
            registrationId: refRegId,
            email: `user${i}@example.com`,
            password: refPassword,
            firstName: `User${i}`,
            lastName: `Referral`,
            phone: `987654321${i}`,
            address: `${i} User Street, City`,
            role: USER_ROLES.USER,
            referredBy: user.id,
          },
        });
        referralUsers.push(refUser);
        console.log(`✅ Created referral user ${i}: ${refUser.registrationId}`);
      } else {
        referralUsers.push(existingRefUser);
        console.log(`⚠️  Referral user ${i} already exists: ${existingRefUser.registrationId}`);
      }
    }
  }

  // Create chit schemes (check if already exist)
  const chitSchemeData = [
    {
      chitId: 'SRC01NS',
      name: 'Monthly Saver Scheme',
      amount: 50000,
      duration: 12,
      totalSlots: 20,
      description: 'Monthly savings chit for 12 months',
    },
    {
      chitId: 'SRC03MC',
      name: 'Annual Growth Plan',
      amount: 100000,
      duration: 24,
      totalSlots: 50,
      description: 'Annual growth chit for 24 months',
    },
    {
      chitId: 'SRC05CM',
      name: 'Premium Investment',
      amount: 200000,
      duration: 36,
      totalSlots: 30,
      description: 'Premium investment chit for 36 months',
    },
  ];

  const chitSchemes = [];
  for (const schemeData of chitSchemeData) {
    let scheme = await prisma.chitScheme.findUnique({
      where: { chitId: schemeData.chitId }
    });

    if (!scheme) {
      scheme = await prisma.chitScheme.create({
        data: schemeData,
      });
      console.log(`✅ Created chit scheme: ${scheme.name} (${scheme.chitId})`);
    } else {
      console.log(`⚠️  Chit scheme already exists: ${scheme.name} (${scheme.chitId})`);
    }
    chitSchemes.push(scheme);
  }

  // Create subscriptions with specific subscriber IDs
  const subscriptions = [];
  
  // Organization subscription for SRC01NS at slot 1
  const orgSub1Id = await generateSubscriberIdWithNumber('SRC01NS', 1);
  let orgSub1 = await prisma.chitSubscription.findUnique({
    where: {
      chitSchemeId_subscriberId: {
        chitSchemeId: chitSchemes[0].id,
        subscriberId: orgSub1Id,
      }
    }
  });

  if (!orgSub1) {
    orgSub1 = await prisma.chitSubscription.create({
      data: {
        subscriberId: orgSub1Id,
        userId: orgUser.id,
        chitSchemeId: chitSchemes[0].id,
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Created org subscription: ${orgSub1.subscriberId}`);
  } else {
    console.log(`⚠️  Org subscription already exists: ${orgSub1.subscriberId}`);
  }
  subscriptions.push(orgSub1);
  
  // SRC01NS subscriptions
  const src01nsSubscriptions = [
    { userId: user.id, subscriberNumber: 4 },
    { userId: referralUsers[0].id, subscriberNumber: 6 },
    { userId: referralUsers[1].id, subscriberNumber: 13 },
    { userId: referralUsers[2].id, subscriberNumber: 12 },
  ];
  
  for (const sub of src01nsSubscriptions) {
    const subscriberId = await generateSubscriberIdWithNumber('SRC01NS', sub.subscriberNumber);
    let userSub = await prisma.chitSubscription.findUnique({
      where: {
        chitSchemeId_subscriberId: {
          chitSchemeId: chitSchemes[0].id,
          subscriberId: subscriberId,
        }
      }
    });

    if (!userSub) {
      userSub = await prisma.chitSubscription.create({
        data: {
          subscriberId: subscriberId,
          userId: sub.userId,
          chitSchemeId: chitSchemes[0].id,
        },
      });
    }
    subscriptions.push(userSub);
  }

  // Organization subscription for SRC03MC at slot 1
  const orgSub2Id = await generateSubscriberIdWithNumber('SRC03MC', 1);
  let orgSub2 = await prisma.chitSubscription.findUnique({
    where: {
      chitSchemeId_subscriberId: {
        chitSchemeId: chitSchemes[1].id,
        subscriberId: orgSub2Id,
      }
    }
  });

  if (!orgSub2) {
    orgSub2 = await prisma.chitSubscription.create({
      data: {
        subscriberId: orgSub2Id,
        userId: orgUser.id,
        chitSchemeId: chitSchemes[1].id,
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Created org subscription: ${orgSub2.subscriberId}`);
  } else {
    console.log(`⚠️  Org subscription already exists: ${orgSub2.subscriberId}`);
  }
  subscriptions.push(orgSub2);
  
  // SRC03MC subscriptions
  const src03mcSubscriptions = [
    { userId: user.id, subscriberNumber: 22 },
    { userId: referralUsers[0].id, subscriberNumber: 9 },
    { userId: referralUsers[1].id, subscriberNumber: 18 },
    { userId: referralUsers[2].id, subscriberNumber: 14 },
    { userId: referralUsers[3].id, subscriberNumber: 25 },
    { userId: referralUsers[4].id, subscriberNumber: 16 },
  ];
  
  for (const sub of src03mcSubscriptions) {
    const subscriberId = await generateSubscriberIdWithNumber('SRC03MC', sub.subscriberNumber);
    let refSub = await prisma.chitSubscription.findUnique({
      where: {
        chitSchemeId_subscriberId: {
          chitSchemeId: chitSchemes[1].id,
          subscriberId: subscriberId,
        }
      }
    });

    if (!refSub) {
      refSub = await prisma.chitSubscription.create({
        data: {
          subscriberId: subscriberId,
          userId: sub.userId,
          chitSchemeId: chitSchemes[1].id,
        },
      });
    }
    subscriptions.push(refSub);
  }

  // Organization subscription for SRC05CM at slot 1
  const orgSub3Id = await generateSubscriberIdWithNumber('SRC05CM', 1);
  let orgSub3 = await prisma.chitSubscription.findUnique({
    where: {
      chitSchemeId_subscriberId: {
        chitSchemeId: chitSchemes[2].id,
        subscriberId: orgSub3Id,
      }
    }
  });

  if (!orgSub3) {
    orgSub3 = await prisma.chitSubscription.create({
      data: {
        subscriberId: orgSub3Id,
        userId: orgUser.id,
        chitSchemeId: chitSchemes[2].id,
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Created org subscription: ${orgSub3.subscriberId}`);
  } else {
    console.log(`⚠️  Org subscription already exists: ${orgSub3.subscriberId}`);
  }
  subscriptions.push(orgSub3);
  
  // SRC05CM subscriptions
  const src05cmSubscriptions = [
    { userId: user.id, subscriberNumber: 5 },
    { userId: referralUsers[0].id, subscriberNumber: 13 },
  ];
  
  for (const sub of src05cmSubscriptions) {
    const subscriberId = await generateSubscriberIdWithNumber('SRC05CM', sub.subscriberNumber);
    let refSub = await prisma.chitSubscription.findUnique({
      where: {
        chitSchemeId_subscriberId: {
          chitSchemeId: chitSchemes[2].id,
          subscriberId: subscriberId,
        }
      }
    });

    if (!refSub) {
      refSub = await prisma.chitSubscription.create({
        data: {
          subscriberId: subscriberId,
          userId: sub.userId,
          chitSchemeId: chitSchemes[2].id,
        },
      });
    }
    subscriptions.push(refSub);
  }

  // Create some payouts
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  for (const subscription of subscriptions.slice(0, 5)) {
    const prevMonth = currentMonth - 1 || 12;
    const prevYear = currentMonth - 1 > 0 ? currentYear : currentYear - 1;

    // Check if payout already exists for previous month
    let payout1 = await prisma.payout.findUnique({
      where: {
        subscriptionId_month_year: {
          subscriptionId: subscription.id,
          month: prevMonth,
          year: prevYear,
        }
      }
    });

    if (!payout1) {
      payout1 = await prisma.payout.create({
        data: {
          userId: subscription.userId,
          subscriptionId: subscription.id,
          amount: 5000,
          month: prevMonth,
          year: prevYear,
          status: PAYOUT_STATUS.PAID,
          paidAt: new Date(),
        },
      });
    }

    // Check if payout already exists for current month
    let payout2 = await prisma.payout.findUnique({
      where: {
        subscriptionId_month_year: {
          subscriptionId: subscription.id,
          month: currentMonth,
          year: currentYear,
        }
      }
    });

    if (!payout2) {
      payout2 = await prisma.payout.create({
        data: {
          userId: subscription.userId,
          subscriptionId: subscription.id,
          amount: 5000,
          month: currentMonth,
          year: currentYear,
          status: PAYOUT_STATUS.PENDING,
        },
      });
    }
  }

  // Create audit logs
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_SEED',
      details: 'Database seeded with initial data',
      ipAddress: '127.0.0.1',
      userAgent: 'Seed Script',
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('\n📋 Demo Credentials:');
  console.log(`👑 Admin: admin@sriruschichits.com / admin123 (${admin?.registrationId || 'N/A'})`);
  console.log(`👤 User: user@sriruschichits.com / user123 (${user?.registrationId || 'N/A'})`);
  console.log('\n📊 Created:');
  console.log(`- ${await prisma.user.count()} users`);
  console.log(`- ${await prisma.chitScheme.count()} chit schemes`);
  console.log(`- ${await prisma.chitSubscription.count()} subscriptions`);
  console.log(`- ${await prisma.payout.count()} payouts`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });