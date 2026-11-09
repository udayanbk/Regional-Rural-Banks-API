import { Body, Controller, Post, Get, Req, Res } from '@nestjs/common';

import type { Request, Response } from 'express';

import { SsoAuthService } from './sso-auth.service.js';
import { SsoLoginDto } from './dto/sso-login.dto.js';

@Controller('auth')
export class SsoAuthController {
  constructor(private readonly ssoAuthService: SsoAuthService) {}

  @Post('login')
  async login(
    @Body() dto: SsoLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.ssoAuthService.login(
      dto,
      req.ip,
      req.get('user-agent'),
    );

    res.cookie('sso_session', result.sessionToken, {
      httpOnly: true,
      secure: process.env.APP_ENV !== 'local',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });

    return {
      message: 'Login successful',
      mustChangePassword: result.mustChangePassword,
      user: result.user,
    };
  }

  @Get('sso/session')
  async getSession(@Req() req: Request) {
    const cookieHeader = req.headers.cookie ?? '';

    const sessionToken = cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith('sso_session='))
      ?.slice('sso_session='.length);

    return this.ssoAuthService.getSession(sessionToken);
  }

  @Post('sso/logout')
async logout(
  @Req() req: Request,
  @Res({ passthrough: true }) res: Response,
) {
  const cookieHeader = req.headers.cookie ?? '';

  const sessionToken = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('sso_session='))
    ?.slice('sso_session='.length);

  await this.ssoAuthService.logout(sessionToken);

  res.clearCookie('sso_session', {
    httpOnly: true,
    secure: process.env.APP_ENV !== 'local',
    sameSite: 'lax',
    path: '/',
  });

  return { message: 'Logged out successfully' };
}
}
