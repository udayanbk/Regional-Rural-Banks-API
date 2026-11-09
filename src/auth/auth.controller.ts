import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';

import type { Request, Response } from 'express';

import { AuthService } from './auth.service.js';
import { SsoAuthService } from './sso/sso-auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly ssoAuthService: SsoAuthService,
  ) {}

  private getSessionToken(req: Request): string | null {
    const cookieHeader = req.headers.cookie;

    if (!cookieHeader) return null;

    const cookieName = this.authService.getCookieName();

    const cookie = cookieHeader
      .split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${cookieName}=`));

    if (!cookie) return null;

    return decodeURIComponent(cookie.substring(cookieName.length + 1));
  }

  @Post('login/request-otp')
  async requestOtp(@Body() body: { email?: unknown }) {
    return this.authService.requestOtp(body.email);
  }

  @Post('login/verify-otp')
  async verifyOtp(
    @Body() body: { email?: unknown; otp?: unknown },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.verifyOtp(body.email, body.otp);

    const { sessionToken, expiresAt, ...responseData } = result;

    response.cookie(this.authService.getCookieName(), sessionToken, {
      ...this.authService.getCookieOptions(),
      expires: expiresAt,
    });

    return responseData;
  }

  @Get('session')
  async getSession(@Req() request: Request) {
    return this.authService.getSession(this.getSessionToken(request));
  }

  @Post('logout')
async logout(
  @Req() req: Request,
  @Res({ passthrough: true }) res: Response,
) {
  const cookieHeader = req.headers.cookie ?? '';

  const getCookie = (name: string): string | null =>
    cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? null;

  await Promise.all([
    this.authService.logout(getCookie('rrb_session')),
    this.ssoAuthService.logout(getCookie('sso_session')),
  ]);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.APP_ENV !== 'local',
    sameSite: 'lax' as const,
    path: '/',
  };

  res.clearCookie('rrb_session', cookieOptions);
  res.clearCookie('sso_session', cookieOptions);

  return { message: 'Logged out successfully' };
}
}
