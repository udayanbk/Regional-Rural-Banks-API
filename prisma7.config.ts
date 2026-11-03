import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

const appEnv = process.env.APP_ENV || 'local';

dotenv.config({
  path: `.env.${appEnv}`,
});

export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});