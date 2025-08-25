import { prisma, generateRegistrationId, generateSubscriberId } from './lib/database';
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
        chitId: 'CHIT001',
        name: 'Monthly Saver Scheme',
        amount: 50000,
        duration: 12,
        totalSlots: 20,
        description: 'Monthly savings chit for 12 months',
      },
    }),
    prisma.chitScheme.create({
      data: {
        chitId: 'CHIT002',
        name: 'Annual Growth Plan',
        amount: 100000,
        duration: 24,
        totalSlots: 50,
        description: 'Annual growth chit for 24 months',
      },
    }),
    prisma.chitScheme.create({
      data: {
        chitId: 'CHIT003',
        name: 'Premium Investment',
        amount: 200000,
        duration: 36,
        totalSlots: 30,
        description: 'Premium investment chit for 36 months',
      },
    }),
  ]);

  // Create subscriptions
  const subscriptions = [];
  for (let i = 0; i < chitSchemes.length; i++) {
    const scheme = chitSchemes[i];
    
    // User subscription
    const userSub = await prisma.chitSubscription.create({
      data: {
        subscriberId: generateSubscriberId(scheme.chitId),
        userId: user.id,
        chitSchemeId: scheme.id,
      },
    });
    subscriptions.push(userSub);

    // Some referral user subscriptions
    for (let j = 0; j < Math.min(3, referralUsers.length); j++) {
      const refSub = await prisma.chitSubscription.create({
        data: {
          subscriberId: generateSubscriberId(scheme.chitId),
          userId: referralUsers[j].id,
          chitSchemeId: scheme.id,
        },
      });
      subscriptions.push(refSub);
    }
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