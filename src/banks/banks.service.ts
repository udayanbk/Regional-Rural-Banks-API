import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class BanksService {
  constructor(private readonly prisma: PrismaService) {}

  // Fetch active banks
  async getBanks() {
    return this.prisma.bank.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        bankName: true,
        bankCode: true,
      },
      orderBy: {
        bankName: "asc",
      },
    });
  }

  // Fetch active branches belonging to a bank
  async getBranches(bankId: number) {
    const bank = await this.prisma.bank.findFirst({
      where: {
        id: bankId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!bank) {
      throw new NotFoundException("Bank not found or inactive.");
    }

    return this.prisma.bankBranch.findMany({
      where: {
        bankId,
        isActive: true,
      },
      select: {
        id: true,
        branchCode: true,
        branchName: true,
        parentBranchId: true,
      },
      orderBy: {
        branchName: "asc",
      },
    });
  }

  // Fetch details of a selected branch
  async getBranchDetails(branchId: number) {
    const branch = await this.prisma.bankBranch.findFirst({
      where: {
        id: branchId,
        isActive: true,
        bank: {
          isActive: true,
        },
      },
      select: {
        id: true,
        bankId: true,
        branchCode: true,
        branchName: true,
        parentBranchId: true,
        bank: {
          select: {
            bankName: true,
            bankCode: true,
          },
        },
        parentBranch: {
          select: {
            id: true,
            branchCode: true,
            branchName: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException("Branch not found or inactive.");
    }

    return branch;
  }
}