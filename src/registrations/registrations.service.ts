import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateRegistrationDto,
  RegistrationPortal,
  RegistrationUserType,
} from './dto/create-registration.dto.js';

@Injectable()
export class RegistrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRegistrationDto) {
    // Validate portal and user type combination.
    const allowedUserTypes: Record<RegistrationPortal, RegistrationUserType[]> = {
      SP: [RegistrationUserType.SP_EMPLOYEE],
      SSO: [
        RegistrationUserType.LICENSING_USER,
        RegistrationUserType.SALES_SUPPORT_OFFICER,
        RegistrationUserType.REGIONAL_MANAGER,
      ],
    };

    if (!allowedUserTypes[dto.portal]?.includes(dto.userType)) {
      throw new BadRequestException('Invalid portal and user type combination');
    }

    // Validate active bank.
    const bank = await this.prisma.bank.findFirst({
      where: {
        id: dto.bankId,
        isActive: true,
      },
    });

    if (!bank) {
      throw new NotFoundException('Bank not found or inactive');
    }

    // Validate branch only when supplied.
    if (dto.branchId) {
      const branch = await this.prisma.bankBranch.findFirst({
        where: {
          id: dto.branchId,
          bankId: dto.bankId,
          isActive: true,
        },
      });

      if (!branch) {
        throw new BadRequestException('Invalid branch selected for this bank');
      }
    }

    const email = dto.email.trim().toLowerCase();
    const employeeId = dto.employeeId?.trim() || null;

    // Check existing user or pending registration.
    const existingRegistration = await this.prisma.preRegisteredUser.findFirst({
      where: {
        bankId: dto.bankId,
        email,
        status: 'PENDING',
      },
    });

    if (existingRegistration) {
      throw new ConflictException('A pending registration already exists for this email');
    }

    const existingUser = await this.prisma.rrbUser.findFirst({
      where: {
        bankId: dto.bankId,
        email,
      },
    });

    if (existingUser) {
      throw new ConflictException('This email is already registered');
    }

    // Save registration.
    return this.prisma.preRegisteredUser.create({
      data: {
        portal: dto.portal,
        userType: dto.userType,
        bankId: dto.bankId,
        branchId: dto.branchId || null,
        employeeId,
        employeeName: dto.employeeName?.trim() || null,
        position: dto.position?.trim() || null,
        dateOfBirth: dto.dateOfBirth
          ? new Date(`${dto.dateOfBirth}T00:00:00.000Z`)
          : null,
        gender: dto.gender || null,
        mobileNo: dto.mobileNo?.trim() || null,
        email,
      },
      select: {
        id: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async approve(registrationId: number, approvedByUserId: number) {
  const defaultPassword = process.env.SSO_DEFAULT_PASSWORD;

  if (!defaultPassword) {
    throw new Error('SSO_DEFAULT_PASSWORD is not configured');
  }

  return this.prisma.$transaction(async (tx) => {
    // 1. Fetch pending registration.
    const registration = await tx.preRegisteredUser.findFirst({
      where: {
        id: registrationId,
        status: 'PENDING',
      },
    });

    if (!registration) {
      throw new NotFoundException(
        'Pending registration not found or already processed',
      );
    }

    // 2. Verify bank.
    const bank = await tx.bank.findFirst({
      where: {
        id: registration.bankId,
        isActive: true,
      },
    });

    if (!bank) {
      throw new BadRequestException('Bank is inactive or unavailable');
    }

    // 3. Verify optional branch.
    if (registration.branchId) {
      const branch = await tx.bankBranch.findFirst({
        where: {
          id: registration.branchId,
          bankId: registration.bankId,
          isActive: true,
        },
      });

      if (!branch) {
        throw new BadRequestException(
          'Selected branch is inactive or unavailable',
        );
      }
    }

    const email = registration.email.trim().toLowerCase();
    const employeeId = registration.employeeId?.trim() || null;

    let approvedUserId: number;

    // 4. SP registration approval.
    if (registration.portal === RegistrationPortal.SP) {
      // RrbUser currently requires branchId.
      if (!registration.branchId) {
        throw new BadRequestException(
          'A branch must be assigned before approving an SP registration',
        );
      }

      const user = await tx.rrbUser.create({
        data: {
          bankId: registration.bankId,
          branchId: registration.branchId,
          employeeId,
          employeeName: registration.employeeName?.trim() || null,
          position: registration.position?.trim() || null,
          dateOfBirth: registration.dateOfBirth,
          gender: registration.gender,
          mobileNo: registration.mobileNo,
          email,
        },
        select: {
          id: true,
        },
      });

      approvedUserId = user.id;
    }

    // 5. SSO registration approval.
    else if (registration.portal === RegistrationPortal.SSO) {
      // Find role using registration userType.
      const role = await tx.ssoRole.findFirst({
        where: {
          roleCode: registration.userType,
          isActive: true,
        },
      });

      if (!role) {
        throw new BadRequestException(
          `Active SSO role not found for ${registration.userType}`,
        );
      }

      // Hash the default password.
      const passwordHash = await bcrypt.hash(defaultPassword, 12);

      const user = await tx.ssoUser.create({
        data: {
          bankId: registration.bankId,
          branchId: registration.branchId,
          roleId: role.id,
          employeeId,
          employeeName: registration.employeeName?.trim() || null,
          position: registration.position?.trim() || null,
          dateOfBirth: registration.dateOfBirth,
          gender: registration.gender,
          mobileNo: registration.mobileNo,
          email,
          passwordHash,
          mustChangePassword: true,
        },
        select: {
          id: true,
        },
      });

      approvedUserId = user.id;
    } else {
      throw new BadRequestException('Invalid registration portal');
    }

    // 6. Mark registration as approved.
    // Conditional update prevents simultaneous approvals.
    const updateResult = await tx.preRegisteredUser.updateMany({
      where: {
        id: registrationId,
        status: 'PENDING',
      },
      data: {
        status: 'APPROVED',
        approvedRejectDate: new Date(),
        approvedRejectUserId: approvedByUserId,
      },
    });

    if (updateResult.count !== 1) {
      throw new ConflictException(
        'Registration has already been processed',
      );
    }

    return {
      message: 'Registration approved successfully',
      registrationId,
      portal: registration.portal,
      userId: approvedUserId,
    };
  });
}
}