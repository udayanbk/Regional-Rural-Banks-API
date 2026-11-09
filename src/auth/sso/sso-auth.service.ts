import { Injectable, UnauthorizedException } from '@nestjs/common';

import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service.js';
import { SsoLoginDto } from './dto/sso-login.dto.js';

@Injectable()
export class SsoAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(dto: SsoLoginDto, ipAddress?: string, userAgent?: string) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.ssoUser.findFirst({
      where: { email },
      include: {
        role: true,
        bank: {
          select: { bankName: true },
        },
      },
    });

    if (!user || !user.isActive || !user.role.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const sessionToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(sessionToken).digest('hex');

    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.ssoAuthSession.create({
        data: {
          ssoUserId: user.id,
          tokenHash,
          expiresAt,
          ipAddress,
          userAgent,
        },
      }),
      this.prisma.ssoUser.update({
        where: { id: user.id },
        data: { lastLoginTime: new Date() },
      }),
    ]);

    return {
      sessionToken,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        employeeName: user.employeeName,
        email: user.email,
        bankName: user.bank.bankName,
        role: user.role.roleCode,
        roleName: user.role.roleName,
      },
    };
  }

  async getSession(sessionToken?: string) {
  if (!sessionToken) {
    return { authenticated: false };
  }

  const tokenHash = createHash('sha256')
    .update(sessionToken)
    .digest('hex');

  const session = await this.prisma.ssoAuthSession.findUnique({
    where: { tokenHash },
    include: {
      ssoUser: {
        include: {
          role: true,
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
    !session.ssoUser.isActive ||
    !session.ssoUser.role.isActive
  ) {
    return { authenticated: false };
  }

  await this.prisma.ssoAuthSession.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  });

  const user = session.ssoUser;

  return {
    authenticated: true,
    user: {
      id: user.id,
      employeeName: user.employeeName ?? '',
      email: user.email,
      bankName: user.bank.bankName,
      portal: 'SSO' as const,
      role: user.role.roleCode,
      roleName: user.role.roleName,
      permissions: [],
    },
  };
}

async logout(sessionToken?: string | null) {
  if (!sessionToken) {
    return { message: 'Logged out successfully' };
  }

  const tokenHash = createHash('sha256')
    .update(sessionToken)
    .digest('hex');

  await this.prisma.ssoAuthSession.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return { message: 'Logged out successfully' };
}
}
