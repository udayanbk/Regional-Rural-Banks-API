
import { BadRequestException, Injectable } from '@nestjs/common';
import type { Express } from 'express';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service.js';

interface BankBranchRecord {
  corporate: string;
  corporateName: string;
  branchCode: string;
  branchName: string | null;
  network: string | null;
  zone: string | null;
  region: string | null;
  sbiGiBranch: string | null;
  circle: string | null;
}

@Injectable()
export class RrbUsersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalize(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private isValidValue(value: string): boolean {
    const normalized = value.trim();

    return normalized !== '' && normalized !== '-' && normalized !== '_';
  }

  private getOptionalValue(value: string): string | null {
    return this.isValidValue(value) ? value.trim() : null;
  }

  private validateFile(file?: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Please upload an Excel file.');
    }

    const extension = file.originalname
      .substring(file.originalname.lastIndexOf('.'))
      .toLowerCase();

    if (!['.xlsx', '.xls'].includes(extension)) {
      throw new BadRequestException(
        'Only .xlsx and .xls files are allowed.',
      );
    }

    if (!file.buffer?.length) {
      throw new BadRequestException('Uploaded Excel file is empty.');
    }
  }

  private readExcelRows(file: Express.Multer.File): unknown[][] {
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets['Data'];

      if (!worksheet) {
        throw new BadRequestException(
          'Worksheet "Data" not found in the uploaded Excel file.',
        );
      }

      const rows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
      }) as unknown[][];

      if (!rows.length) {
        throw new BadRequestException('Excel worksheet is empty.');
      }

      return rows;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        'Unable to read the Excel file. Please check that it is valid.',
      );
    }
  }

  private findHeaderRow(
    rows: unknown[][],
    requiredColumns: string[],
  ): number {
    const headerRowIndex = rows.findIndex((row) => {
      const headers = new Set(
        row.map((cell) => this.normalize(String(cell ?? ''))),
      );

      return requiredColumns.every((column) =>
        headers.has(this.normalize(column)),
      );
    });

    if (headerRowIndex === -1) {
      throw new BadRequestException({
        success: false,
        message: 'Could not identify the Excel header row.',
        requiredColumns,
      });
    }

    return headerRowIndex;
  }

  private getColumnIndexes(
    headers: string[],
    requiredColumns: string[],
  ): Map<string, number> {
    const uploadedColumns = new Set(headers.map(this.normalize.bind(this)));

    const missingColumns = requiredColumns.filter(
      (column) => !uploadedColumns.has(this.normalize(column)),
    );

    if (missingColumns.length) {
      throw new BadRequestException({
        success: false,
        message: 'Excel file is missing required columns.',
        missingColumns,
        requiredColumns,
      });
    }

    return new Map(
      headers.map((header, index) => [
        this.normalize(header),
        index,
      ]),
    );
  }

  private getCellValue(
    row: unknown[],
    columnIndexes: Map<string, number>,
    column: string,
  ): string {
    const index = columnIndexes.get(this.normalize(column));

    return index === undefined
      ? ''
      : String(row[index] ?? '').trim();
  }

  // --------------------------------------------------
  // BANK AND BRANCH MASTER UPLOAD
  // POST /api/v1/rrb-users/upload/bank-branches
  // --------------------------------------------------

  async uploadBankBranches(file?: Express.Multer.File) {
    this.validateFile(file);

    const rows = this.readExcelRows(file!);

    const requiredColumns = [
      'Corporate',
      'Corporate Name',
      'Branch Code',
      'Branch Name',
      'Network',
      'Zone',
      'Region',
      'SBI GI Branch',
      'Circle',
    ];

    const headerRowIndex = rows.findIndex((row) => {
      const headers = new Set(
        row.map((cell) => this.normalize(String(cell ?? ''))),
      );

      return (
        headers.has(this.normalize('Corporate')) ||
        headers.has(this.normalize('Corporate Name')) ||
        headers.has(this.normalize('Branch Code'))
      );
    });

    if (headerRowIndex === -1) {
      throw new BadRequestException(
        'Could not identify the Excel header row.',
      );
    }

    const headers = rows[headerRowIndex].map((cell) =>
      String(cell ?? '').replace(/^\uFEFF/, '').trim(),
    );

    const columnIndexes = this.getColumnIndexes(
      headers,
      requiredColumns,
    );

    const excelRows = rows
      .slice(headerRowIndex + 1)
      .filter((row) =>
        row.some((cell) => String(cell ?? '').trim() !== ''),
      );

    if (!excelRows.length) {
      throw new BadRequestException(
        'Excel file contains no branch records.',
      );
    }

    const records: BankBranchRecord[] = [];

    let skippedRows = 0;

    for (const row of excelRows) {
      const corporate = this.getCellValue(
        row,
        columnIndexes,
        'Corporate',
      );

      const corporateName = this.getCellValue(
        row,
        columnIndexes,
        'Corporate Name',
      );

      const branchCode = this.getCellValue(
        row,
        columnIndexes,
        'Branch Code',
      );

      // Skip rows with invalid mandatory values
      if (
        !this.isValidValue(corporate) ||
        !this.isValidValue(corporateName) ||
        !this.isValidValue(branchCode)
      ) {
        skippedRows++;
        continue;
      }

      records.push({
        corporate,
        corporateName,
        branchCode,
        branchName: this.getOptionalValue(
          this.getCellValue(row, columnIndexes, 'Branch Name'),
        ),
        network: this.getOptionalValue(
          this.getCellValue(row, columnIndexes, 'Network'),
        ),
        zone: this.getOptionalValue(
          this.getCellValue(row, columnIndexes, 'Zone'),
        ),
        region: this.getOptionalValue(
          this.getCellValue(row, columnIndexes, 'Region'),
        ),
        sbiGiBranch: this.getOptionalValue(
          this.getCellValue(row, columnIndexes, 'SBI GI Branch'),
        ),
        circle: this.getOptionalValue(
          this.getCellValue(row, columnIndexes, 'Circle'),
        ),
      });
    }

    if (!records.length) {
      throw new BadRequestException(
        'No valid bank and branch records found in the Excel file.',
      );
    }

    // Corporate code/name consistency check (case-insensitive)
    const bankNames = new Map<string, string>();

    for (const record of records) {
      const existingName = bankNames.get(record.corporate);

      if (
        existingName &&
        this.normalize(existingName) !==
          this.normalize(record.corporateName)
      ) {
        throw new BadRequestException(
          `Corporate "${record.corporate}" has multiple Corporate Names in the uploaded file.`,
        );
      }

      if (!existingName) {
        bankNames.set(record.corporate, record.corporateName);
      }
    }

    // Insert/update banks and branches atomically
    const result = await this.prisma.$transaction(async (tx) => {
      const bankIds = new Map<string, number>();

      let banksProcessed = 0;
      let branchesProcessed = 0;

      for (const record of records) {
        let bankId = bankIds.get(record.corporate);

        if (!bankId) {
          const bank = await tx.bank.upsert({
            where: {
              bankCode: record.corporate,
            },
            create: {
              bankCode: record.corporate,
              bankName: record.corporateName,
              address: null,
              isActive: true,
            },
            update: {
              bankName: record.corporateName,
              isActive: true,
            },
            select: {
              id: true,
            },
          });

          bankId = bank.id;
          bankIds.set(record.corporate, bankId);
          banksProcessed++;
        }

        await tx.bankBranch.upsert({
          where: {
            bankId_branchCode: {
              bankId,
              branchCode: record.branchCode,
            },
          },
          create: {
            bankId,
            branchCode: record.branchCode,
            branchName: record.branchName ?? '',
            network: record.network,
            zone: record.zone,
            region: record.region,
            sbiGiBranch: record.sbiGiBranch,
            circle: record.circle,
          },
          update: {
            branchName: record.branchName ?? '',
            network: record.network,
            zone: record.zone,
            region: record.region,
            sbiGiBranch: record.sbiGiBranch,
            circle: record.circle,
          },
        });

        branchesProcessed++;
      }

      return {
        banksProcessed,
        branchesProcessed,
      };
    });

    return {
      success: true,
      message: 'Bank and Branch Master uploaded successfully.',
      summary: {
        totalRows: excelRows.length,
        ...result,
        skippedRows,
      },
    };
  }

  // --------------------------------------------------
  // RRB USERS UPLOAD
  // POST /api/v1/rrb-users/upload/users
  // --------------------------------------------------

  async uploadUsers(file?: Express.Multer.File) {
    this.validateFile(file);

    const rows = this.readExcelRows(file!);

    const requiredColumns = [
      'Corporate',
      'Name',
      'Mobile no',
      'Email ID',
      'Branch Code',
    ];

    const headerRowIndex = this.findHeaderRow(
      rows,
      requiredColumns,
    );

    const headers = rows[headerRowIndex].map((cell) =>
      String(cell ?? '').replace(/^\uFEFF/, '').trim(),
    );

    const columnIndexes = this.getColumnIndexes(
      headers,
      requiredColumns,
    );

    const excelRows = rows
      .slice(headerRowIndex + 1)
      .filter((row) =>
        row.some((cell) => String(cell ?? '').trim() !== ''),
      );

    if (!excelRows.length) {
      throw new BadRequestException(
        'Excel file contains no user records.',
      );
    }

    const summary = {
      totalRows: excelRows.length,
      inserted: 0,
      skippedMissingValues: 0,
      skippedInvalidCorporate: 0,
      skippedInvalidBranch: 0,
      skippedDuplicates: 0,
    };

    // Track duplicates within this upload
    const uploadedMobiles = new Set<string>();
    const uploadedEmails = new Set<string>();

    // Load existing banks
    const banks = await this.prisma.bank.findMany({
      select: {
        id: true,
        bankCode: true,
      },
    });

    const bankMap = new Map(
      banks.map((bank) => [
        this.normalize(bank.bankCode),
        bank.id,
      ]),
    );

    // Load existing branches
    const branches = await this.prisma.bankBranch.findMany({
      select: {
        id: true,
        bankId: true,
        branchCode: true,
      },
    });

    const branchMap = new Map(
      branches.map((branch) => [
        `${branch.bankId}_${this.normalize(branch.branchCode)}`,
        branch.id,
      ]),
    );

    // Load existing global mobile numbers and emails
    const existingUsers = await this.prisma.rrbUser.findMany({
      select: {
        mobileNo: true,
        email: true,
      },
    });

    const existingMobiles = new Set(
      existingUsers
        .map((user) => user.mobileNo?.trim())
        .filter((value): value is string => !!value)
        .map((value) => value.toLowerCase()),
    );

    const existingEmails = new Set(
      existingUsers.map((user) => user.email.trim().toLowerCase()),
    );

    for (const row of excelRows) {
      const corporate = this.getCellValue(
        row,
        columnIndexes,
        'Corporate',
      );

      const name = this.getCellValue(
        row,
        columnIndexes,
        'Name',
      );

      const mobileNo = this.getCellValue(
        row,
        columnIndexes,
        'Mobile no',
      );

      const email = this.getCellValue(
        row,
        columnIndexes,
        'Email ID',
      ).toLowerCase();

      const branchCode = this.getCellValue(
        row,
        columnIndexes,
        'Branch Code',
      );

      // Skip rows with missing mandatory values
      if (
        !this.isValidValue(corporate) ||
        !this.isValidValue(name) ||
        !this.isValidValue(mobileNo) ||
        !this.isValidValue(email) ||
        !this.isValidValue(branchCode)
      ) {
        summary.skippedMissingValues++;
        continue;
      }

      // Corporate must already exist
      const bankId = bankMap.get(this.normalize(corporate));

      if (!bankId) {
        summary.skippedInvalidCorporate++;
        continue;
      }

      // Branch must belong to the resolved bank
      const branchId = branchMap.get(
        `${bankId}_${this.normalize(branchCode)}`,
      );

      if (!branchId) {
        summary.skippedInvalidBranch++;
        continue;
      }

      const normalizedMobile = mobileNo.trim().toLowerCase();
      const normalizedEmail = email.trim().toLowerCase();

      // Check duplicates globally and within this upload
      if (
        existingMobiles.has(normalizedMobile) ||
        existingEmails.has(normalizedEmail) ||
        uploadedMobiles.has(normalizedMobile) ||
        uploadedEmails.has(normalizedEmail)
      ) {
        summary.skippedDuplicates++;
        continue;
      }

      try {
        await this.prisma.rrbUser.create({
          data: {
            bankId,
            branchId,
            employeeName: name,
            mobileNo: mobileNo.trim(),
            email: normalizedEmail,
            employeeId: null,
            position: null,
            dateOfBirth: null,
            gender: null,
            isActive: true,
          },
        });

        existingMobiles.add(normalizedMobile);
        existingEmails.add(normalizedEmail);
        uploadedMobiles.add(normalizedMobile);
        uploadedEmails.add(normalizedEmail);

        summary.inserted++;
      } catch (error) {
        // Handle concurrent uploads and unique constraint violations
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'P2002'
        ) {
          summary.skippedDuplicates++;
          continue;
        }

        throw error;
      }
    }

    return {
      success: true,
      message: 'RRB Users Excel upload completed.',
      summary,
    };
  }
}
