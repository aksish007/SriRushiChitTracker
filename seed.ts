import { prisma, generateRegistrationId, generateSubscriberIdWithNumber } from './lib/database';
import { hashPassword } from './lib/auth';
import { USER_ROLES, SUBSCRIPTION_STATUS, PAYOUT_STATUS } from './lib/constants';

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const adminPassword = await hashPassword('admin123');
  const adminRegId = generateRegistrationId();
  
  const admin = await prisma.user.create({
    data: {
      registrationId: adminRegId,
      email: 'admin@sriruschichits.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      phone: '9876543210',
      address: 'Admin Office, City',
      role: USER_ROLES.ADMIN,
    },
  });

  // Create regular user
  const userPassword = await hashPassword('user123');
  const userRegId = generateRegistrationId();
  
  const user = await prisma.user.create({
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

  // Create some referral users
  const referralUsers = [];
  for (let i = 1; i <= 5; i++) {
    const refPassword = await hashPassword('user123');
    const refRegId = generateRegistrationId();
    
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
  }

  // Create chit schemes
  const chitSchemes = await Promise.all([
    prisma.chitScheme.create({
      data: {
        chitId: 'SRC01NS',
        name: 'Monthly Saver Scheme',
        amount: 50000,
        duration: 12,
        totalSlots: 20,
        description: 'Monthly savings chit for 12 months',
      },
    }),
    prisma.chitScheme.create({
      data: {
        chitId: 'SRC03MC',
        name: 'Annual Growth Plan',
        amount: 100000,
        duration: 24,
        totalSlots: 50,
        description: 'Annual growth chit for 24 months',
      },
    }),
    prisma.chitScheme.create({
      data: {
        chitId: 'SRC05CM',
        name: 'Premium Investment',
        amount: 200000,
        duration: 36,
        totalSlots: 30,
        description: 'Premium investment chit for 36 months',
      },
    }),
  ]);

  // Create subscriptions with specific subscriber IDs
  const subscriptions = [];
  
  // SRC01NS subscriptions
  const src01nsSubscriptions = [
    { userId: user.id, subscriberNumber: 4 },
    { userId: referralUsers[0].id, subscriberNumber: 6 },
    { userId: referralUsers[1].id, subscriberNumber: 13 },
    { userId: referralUsers[2].id, subscriberNumber: 12 },
  ];
  
  for (const sub of src01nsSubscriptions) {
    const userSub = await prisma.chitSubscription.create({
      data: {
        subscriberId: await generateSubscriberIdWithNumber('SRC01NS', sub.subscriberNumber),
        userId: sub.userId,
        chitSchemeId: chitSchemes[0].id,
      },
    });
    subscriptions.push(userSub);
  }

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
    const refSub = await prisma.chitSubscription.create({
      data: {
        subscriberId: await generateSubscriberIdWithNumber('SRC03MC', sub.subscriberNumber),
        userId: sub.userId,
        chitSchemeId: chitSchemes[1].id,
      },
    });
    subscriptions.push(refSub);
  }

  // SRC05CM subscriptions
  const src05cmSubscriptions = [
    { userId: user.id, subscriberNumber: 5 },
    { userId: referralUsers[0].id, subscriberNumber: 13 },
  ];
  
  for (const sub of src05cmSubscriptions) {
    const refSub = await prisma.chitSubscription.create({
      data: {
        subscriberId: await generateSubscriberIdWithNumber('SRC05CM', sub.subscriberNumber),
        userId: sub.userId,
        chitSchemeId: chitSchemes[2].id,
      },
    });
    subscriptions.push(refSub);
  }

  // Create some payouts
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  for (const subscription of subscriptions.slice(0, 5)) {
    await prisma.payout.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        amount: 5000,
        month: currentMonth - 1 || 12,
        year: currentMonth - 1 > 0 ? currentYear : currentYear - 1,
        status: PAYOUT_STATUS.PAID,
        paidAt: new Date(),
      },
    });

    await prisma.payout.create({
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
  console.log(`👑 Admin: admin@sriruschichits.com / admin123 (${adminRegId})`);
  console.log(`👤 User: user@sriruschichits.com / user123 (${userRegId})`);
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