import { Module } from '@nestjs/common';

import { SsoAuthController } from './sso-auth.controller.js';
import { SsoAuthService } from './sso-auth.service.js';

@Module({
  controllers: [SsoAuthController],
  providers: [SsoAuthService],
  exports: [SsoAuthService],
})
export class SsoAuthModule {}