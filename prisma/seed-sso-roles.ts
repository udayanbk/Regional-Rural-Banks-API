import dotenv from 'dotenv';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client.js';

dotenv.config({
  path: `.env.${process.env.APP_ENV || 'local'}`,
});

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured');
}

const adapter = new PrismaMariaDb(databaseUrl);
const prisma = new PrismaClient({ adapter });

const roles = [
  {
    roleCode: 'LICENSING_EXECUTIVE',
    roleName: 'Licensing Executive',
    description: 'SSO user responsible for licensing operations.',
  },
  {
    roleCode: 'SALES_SUPPORT_OFFICER',
    roleName: 'Sales Support Officer',
    description: 'SSO user responsible for sales support operations.',
  },
  {
    roleCode: 'REGIONAL_MANAGER',
    roleName: 'Regional Manager',
    description: 'SSO user responsible for regional management.',
  },
];

async function main() {
  for (const role of roles) {
    await prisma.ssoRole.upsert({
      where: {
        roleCode: role.roleCode,
      },
      update: {
        roleName: role.roleName,
        description: role.description,
        isActive: true,
      },
      create: role,
    });
  }

  console.log('SSO roles seeded successfully');

  const savedRoles = await prisma.ssoRole.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      roleCode: true,
      roleName: true,
      isActive: true,
    },
  });

  console.table(savedRoles);
}

main()
  .catch((error) => {
    console.error('SSO role seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });