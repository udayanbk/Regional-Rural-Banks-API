import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    const adapter = new PrismaMariaDb(
      configService.getOrThrow<string>('DATABASE_URL'),
    );

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('MySQL database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}