// prisma/seed.js
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const prisma = new PrismaClient();
  try {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
      console.error('ADMIN_PASSWORD is not set in .env');
      process.exit(1);
    }

    const hash = await bcrypt.hash(password, 10);
    const adminEmail = 'andurumitchelleanyango@gmail.com';

    const admin = await prisma.staffUser.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        name: 'Super Admin',
        email: adminEmail,
        passwordHash: hash,
        role: 'ADMIN'
      }
    });

    console.log('Seeded admin user:', admin.email);
  } catch (e) {
    console.error('Seeding failed:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
