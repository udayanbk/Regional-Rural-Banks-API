import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthService {
  private readonly sessionDuration = 8 * 60 * 60 * 1000;
  private readonly sessionCookieName = 'rrb_session';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private isLocalEnvironment(): boolean {
    return (
      (this.configService.get<string>('APP_ENV') ??
        process.env.APP_ENV ??
        'local') === 'local'
    );
  }

  private normalizeEmail(email: unknown): string {
    if (typeof email !== 'string') {
      throw new BadRequestException('Valid email is required');
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (
      normalizedEmail.length > 190 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      throw new BadRequestException('Valid email is required');
    }

    return normalizedEmail;
  }

  async requestOtp(email: unknown) {
    const normalizedEmail = this.normalizeEmail(email);

    // Generic response prevents account enumeration.
    const users = await this.prisma.user.findMany({
      where: {
        email: normalizedEmail,
        isActive: true,
      },
      select: { id: true },
      take: 2,
    });

    if (users.length > 1) {
      throw new ConflictException(
        'This email is associated with multiple bank accounts',
      );
    }

    return {
      message:
        'If an active account exists, you can continue with OTP verification',
    };
  }

  async verifyOtp(email: unknown, otp: unknown) {
    if (!this.isLocalEnvironment()) {
      throw new UnauthorizedException(
        'Development OTP authentication is disabled',
      );
    }

    const normalizedEmail = this.normalizeEmail(email);

    if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      throw new BadRequestException('Enter a valid six-digit OTP');
    }

    if (otp !== '010101') {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const users = await this.prisma.user.findMany({
      where: {
        email: normalizedEmail,
        isActive: true,
      },
      select: {
        id: true,
        employeeName: true,
        employeeId: true,
        email: true,
        bankId: true,
        branchId: true,
      },
      take: 2,
    });

    if (users.length === 0) {
      throw new UnauthorizedException('Invalid email or OTP');
    }

    if (users.length > 1) {
      throw new ConflictException(
        'This email is associated with multiple bank accounts',
      );
    }

    const user = users[0];

    const sessionToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(sessionToken);
    const expiresAt = new Date(Date.now() + this.sessionDuration);

    await this.prisma.$transaction([
      this.prisma.authSession.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginTime: new Date() },
      }),
    ]);

    return {
      sessionToken,
      expiresAt,
      user: {
        id: user.id,
        employeeName: user.employeeName,
        employeeId: user.employeeId,
        email: user.email,
        portal: 'SP' as const,
        role: 'SP_EMPLOYEE',
        permissions: ['profile.view', 'applications.view'],
      },
    };
  }

  async getSession(token: string | null) {
    if (!token) {
      return { authenticated: false };
    }

    const tokenHash = this.hashToken(token);

    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            bank: {
              select: {
                bankName: true,
              },
            },
          },
        },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.isActive
    ) {
      return { authenticated: false };
    }

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    return {
  authenticated: true,
  user: {
    id: session.user.id,
    employeeName: session.user.employeeName,
    employeeId: session.user.employeeId,
    email: session.user.email,
    bankName: session.user.bank.bankName,
    portal: "SP",
    role: "SP_EMPLOYEE",
    permissions: ["profile.view", "applications.view"],
  },
};
  }

  async logout(token: string | null) {
    if (token) {
      await this.prisma.authSession.updateMany({
        where: {
          tokenHash: this.hashToken(token),
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    return { message: 'Logged out successfully' };
  }

  getCookieName(): string {
    return this.sessionCookieName;
  }

  getCookieOptions() {
    return {
      httpOnly: true,
      secure: !this.isLocalEnvironment(),
      sameSite: 'lax' as const,
      path: '/',
    };
  }
}
