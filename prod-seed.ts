import { prisma, generateRegistrationId } from './lib/database';
import { hashPassword } from './lib/auth';
import { USER_ROLES } from './lib/constants';

async function main() {
  console.log('🌱 Starting production seed...');

  let admin: any = null;

  // Check if admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: {
      role: USER_ROLES.ADMIN,
    },
  });

  if (existingAdmin) {
    console.log('⚠️  Admin user already exists. Skipping admin creation.');
    console.log(`📧 Existing admin email: ${existingAdmin.email}`);
    console.log(`🆔 Registration ID: ${existingAdmin.registrationId}`);
    admin = existingAdmin;
  } else {

  // Create admin user with secure credentials
  const adminPassword = await hashPassword('Admin@2025!');
  const adminRegId = generateRegistrationId();
  
  const admin = await prisma.user.create({
    data: {
      registrationId: adminRegId,
      email: 'admin@sriruschichits.com',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      phone: '9876543210',
      address: 'System Administration Office',
      role: USER_ROLES.ADMIN,
      isActive: true,
    },
  });

    // Create audit log for admin creation
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'PRODUCTION_SEED',
        details: 'Production admin user created',
        ipAddress: '127.0.0.1',
        userAgent: 'Production Seed Script',
      },
    });

    console.log(`✅ Created admin user with email: ${admin.email} and Registration ID: ${adminRegId}`);
  }

  // Seed Chit Schemes
  console.log('🌱 Seeding chit schemes...');

  const chitSchemes = [
    // Executive Club Member - 20 months
    {
      chitId: 'EXC01-20M',
      name: 'Executive Club Member I',
      amount: 50000,
      duration: 20,
      totalSlots: 20,
      description: 'Executive Club Member chit scheme for 20 months with 20 members',
    },
    // Executive Club Member - 25 months
    {
      chitId: 'EXC02-25M',
      name: 'Executive Club Member II',
      amount: 50000,
      duration: 25,
      totalSlots: 20,
      description: 'Executive Club Member chit scheme for 25 months with 20 members',
    },
    // Development Club Member - 20 months
    {
      chitId: 'DEV01-20M',
      name: 'Development Club Member I',
      amount: 100000,
      duration: 20,
      totalSlots: 20,
      description: 'Development Club Member chit scheme for 20 months with 20 members',
    },
    // Development Club Member - 25 months
    {
      chitId: 'DEV02-25M',
      name: 'Development Club Member II',
      amount: 100000,
      duration: 25,
      totalSlots: 20,
      description: 'Development Club Member chit scheme for 25 months with 20 members',
    },
    // Manager Club Member - 20 months
    {
      chitId: 'MGR01-20M',
      name: 'Manager Club Member I',
      amount: 200000,
      duration: 20,
      totalSlots: 20,
      description: 'Manager Club Member chit scheme for 20 months with 20 members',
    },
    // Manager Club Member - 25 months
    {
      chitId: 'MGR02-25M',
      name: 'Manager Club Member II',
      amount: 200000,
      duration: 25,
      totalSlots: 20,
      description: 'Manager Club Member chit scheme for 25 months with 20 members',
    },
    // Regional Club Member - 20 months
    {
      chitId: 'REG01-20M',
      name: 'Regional Club Member I',
      amount: 300000,
      duration: 20,
      totalSlots: 20,
      description: 'Regional Club Member chit scheme for 20 months with 20 members',
    },
    // Regional Club Member - 25 months
    {
      chitId: 'REG02-25M',
      name: 'Regional Club Member II',
      amount: 300000,
      duration: 25,
      totalSlots: 20,
      description: 'Regional Club Member chit scheme for 25 months with 20 members',
    },
    // Regional Club Member - 30 months
    {
      chitId: 'REG03-30M',
      name: 'Regional Club Member III',
      amount: 300000,
      duration: 30,
      totalSlots: 20,
      description: 'Regional Club Member chit scheme for 30 months with 20 members',
    },
    // Chairman Club Member - 20 months
    {
      chitId: 'CHA01-20M',
      name: 'Chairman Club Member I',
      amount: 500000,
      duration: 20,
      totalSlots: 20,
      description: 'Chairman Club Member chit scheme for 20 months with 20 members',
    },
    // Chairman Club Member - 25 months
    {
      chitId: 'CHA02-25M',
      name: 'Chairman Club Member II',
      amount: 500000,
      duration: 25,
      totalSlots: 20,
      description: 'Chairman Club Member chit scheme for 25 months with 20 members',
    },
    // Chairman Club Member - 40 months
    {
      chitId: 'CHA03-40M',
      name: 'Chairman Club Member III',
      amount: 500000,
      duration: 40,
      totalSlots: 20,
      description: 'Chairman Club Member chit scheme for 40 months with 20 members',
    },
    // Diamond Club Member - 20 months
    {
      chitId: 'DIA01-20M',
      name: 'Diamond Club Member I',
      amount: 1000000,
      duration: 20,
      totalSlots: 20,
      description: 'Diamond Club Member chit scheme for 20 months with 20 members',
    },
    // Diamond Club Member - 25 months
    {
      chitId: 'DIA02-25M',
      name: 'Diamond Club Member II',
      amount: 1000000,
      duration: 25,
      totalSlots: 20,
      description: 'Diamond Club Member chit scheme for 25 months with 20 members',
    },
    // Diamond Club Member - 40 months
    {
      chitId: 'DIA03-40M',
      name: 'Diamond Club Member III',
      amount: 1000000,
      duration: 40,
      totalSlots: 20,
      description: 'Diamond Club Member chit scheme for 40 months with 20 members',
    },
  ];

  for (const schemeData of chitSchemes) {
    const existingScheme = await prisma.chitScheme.findFirst({
      where: { chitId: schemeData.chitId },
    });

    if (!existingScheme) {
      await prisma.chitScheme.create({
        data: schemeData,
      });
      console.log(`✅ Created chit scheme: ${schemeData.name} (${schemeData.chitId})`);
    } else {
      console.log(`⚠️  Chit scheme "${schemeData.name}" already exists. Skipping.`);
    }
  }

  console.log('✅ Production seed completed successfully!');
  console.log('\n📋 Admin Credentials:');
  console.log(`📧 Email: ${admin?.email || 'admin@sriruschichits.com'}`);
  console.log(`🔑 Password: Admin@2025!`);
  console.log(`🆔 Registration ID: ${admin?.registrationId || 'N/A'}`);
  console.log('\n📊 Created:');
  console.log(`- 1 admin user`);
  console.log(`- 15 chit schemes (All Club Member types)`);
  console.log(`- 1 audit log entry`);
  console.log('\n⚠️  IMPORTANT:');
  console.log('- Change the admin password immediately after first login');
  console.log('- Store credentials securely');
  console.log('- Remove or secure this seed file after deployment');
}

main()
  .catch((e) => {
    console.error('❌ Production seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });