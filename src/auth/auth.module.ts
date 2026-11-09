import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { SsoAuthModule } from "./sso/sso-auth.module.js";

@Module({
  imports: [PrismaModule, SsoAuthModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}