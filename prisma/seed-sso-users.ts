import dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client.js';

const appEnv = process.env.APP_ENV || 'local';

if (appEnv !== 'local') {
  throw new Error('SSO sample users can only be seeded in the local environment.');
}

dotenv.config({ path: `.env.${appEnv}` });

const databaseUrl = process.env.DATABASE_URL;
// const defaultPassword = process.env.SSO_DEFAULT_PASSWORD;
const defaultPassword: string = process.env.SSO_DEFAULT_PASSWORD ?? '';

if (!defaultPassword.trim()) {
  throw new Error('SSO_DEFAULT_PASSWORD is not configured in .env.local');
}
const bankId = Number(process.env.SSO_SEED_BANK_ID);
const branchId = process.env.SSO_SEED_BRANCH_ID
  ? Number(process.env.SSO_SEED_BRANCH_ID)
  : null;

if (!databaseUrl || !defaultPassword || !Number.isInteger(bankId) || bankId <= 0) {
  throw new Error(
    'Configure DATABASE_URL, SSO_DEFAULT_PASSWORD and SSO_SEED_BANK_ID in .env.local',
  );
}

const adapter = new PrismaMariaDb(databaseUrl);
const prisma = new PrismaClient({ adapter });

const sampleUsers = [
  {
    roleCode: 'LICENSING_EXECUTIVE',
    employeeId: 'SSO-LIC-001',
    employeeName: 'Sample Licensing User',
    position: 'Licensing Executive',
    email: 'licensing.user@example.test',
    mobileNo: '9000000001',
  },
  {
    roleCode: 'SALES_SUPPORT_OFFICER',
    employeeId: 'SSO-SSO-001',
    employeeName: 'Sample Sales Support Officer',
    position: 'Sales Support Officer',
    email: 'sales.support@example.test',
    mobileNo: '9000000002',
  },
  {
    roleCode: 'REGIONAL_MANAGER',
    employeeId: 'SSO-RM-001',
    employeeName: 'Sample Regional Manager',
    position: 'Regional Manager',
    email: 'regional.manager@example.test',
    mobileNo: '9000000003',
  },
];

async function main() {
  // Verify bank.
  const bank = await prisma.bank.findFirst({
    where: {
      id: bankId,
      isActive: true,
    },
  });

  if (!bank) {
    throw new Error(`Active bank with ID ${bankId} was not found.`);
  }

  // Verify optional branch.
  if (branchId !== null) {
    const branch = await prisma.bankBranch.findFirst({
      where: {
        id: branchId,
        bankId,
        isActive: true,
      },
    });

    if (!branch) {
      throw new Error(`Active branch with ID ${branchId} was not found for this bank.`);
    }
  }

  // Generate password hash once for all three sample users.
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  for (const sample of sampleUsers) {
    const role = await prisma.ssoRole.findUnique({
      where: { roleCode: sample.roleCode },
    });

    if (!role || !role.isActive) {
      throw new Error(`Active SSO role not found: ${sample.roleCode}`);
    }

    await prisma.ssoUser.upsert({
      where: {
        bankId_email: {
          bankId,
          email: sample.email,
        },
      },
      update: {
        roleId: role.id,
        branchId,
        employeeId: sample.employeeId,
        employeeName: sample.employeeName,
        position: sample.position,
        mobileNo: sample.mobileNo,
        isActive: true,
      },
      create: {
        bankId,
        branchId,
        roleId: role.id,
        employeeId: sample.employeeId,
        employeeName: sample.employeeName,
        position: sample.position,
        mobileNo: sample.mobileNo,
        email: sample.email,
        passwordHash,
        mustChangePassword: true,
        isActive: true,
      },
    });

    console.log(`Seeded: ${sample.email} (${sample.roleCode})`);
  }

  console.log('\nThree SSO sample users seeded successfully.');
}

main()
  .catch((error) => {
    console.error('SSO user seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });