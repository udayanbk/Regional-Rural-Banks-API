import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validate } from "./config/env.validation.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { BanksModule } from "./banks/banks.module.js";
import { RegistrationsModule } from "./registrations/registrations.module.js";
import { SsoAuthModule } from "./auth/sso/sso-auth.module.js";
import { BranchMasterModule } from './branch-master/branch-master.module.js';
import { RrbUsersModule } from './rrb-users/rrb-users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.APP_ENV || "local"}`,
      validate,
    }),
    PrismaModule,
    AuthModule,
    BanksModule,
    RegistrationsModule,
    SsoAuthModule,
    SsoAuthModule,
    BranchMasterModule,
    RrbUsersModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}