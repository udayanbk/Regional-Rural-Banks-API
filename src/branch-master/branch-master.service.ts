
import { BadRequestException, Injectable } from '@nestjs/common';
import type { Express } from 'express';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class BranchMasterService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Please upload an Excel file.');
    }

    const allowedExtensions = ['.xlsx', '.xls'];
    const extension = file.originalname
      .substring(file.originalname.lastIndexOf('.'))
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        'Only .xlsx and .xls files are allowed.',
      );
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded Excel file is empty.');
    }

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

    let rows: unknown[][];

    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });

      const sheetName = 'Data';
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        throw new BadRequestException(
          `Worksheet "${sheetName}" not found in the uploaded Excel file.`,
        );
      }

      rows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
      }) as unknown[][];

      if (!rows.length) {
        throw new BadRequestException('Excel worksheet is empty.');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        'Unable to read the Excel file. Please check that it is a valid Excel document.',
      );
    }

    const normalize = (value: string) =>
      value.trim().replace(/\s+/g, ' ').toLowerCase();

    // Automatically identify the header row
    const headerRowIndex = rows.findIndex((row) => {
      const rowColumns = new Set(
        row.map((cell) => normalize(String(cell ?? ''))),
      );

      return (
        rowColumns.has(normalize('Corporate')) ||
        rowColumns.has(normalize('Corporate Name')) ||
        rowColumns.has(normalize('Branch Code'))
      );
    });

    if (headerRowIndex === -1) {
      throw new BadRequestException(
        'Could not identify the Excel header row.',
      );
    }

    const headers = rows[headerRowIndex].map((header) =>
      String(header ?? '').replace(/^\uFEFF/, '').trim(),
    );

    // Validate required columns
    const uploadedColumns = new Set(headers.map(normalize));

    const missingColumns = requiredColumns.filter(
      (column) => !uploadedColumns.has(normalize(column)),
    );

    if (missingColumns.length) {
      throw new BadRequestException({
        success: false,
        message: 'Excel file is missing required columns.',
        missingColumns,
        requiredColumns,
      });
    }

    // Map Excel columns to their indexes
    const columnIndexes = new Map(
      headers.map((header, index) => [normalize(header), index]),
    );

    const getCellValue = (
      row: unknown[],
      column: string,
    ): string => {
      const index = columnIndexes.get(normalize(column));

      return index === undefined
        ? ''
        : String(row[index] ?? '').trim();
    };

    // Treat empty, "-" and "_" as invalid values
    const isValidValue = (value: string): boolean => {
      const normalizedValue = value.trim();

      return (
        normalizedValue !== '' &&
        normalizedValue !== '-' &&
        normalizedValue !== '_'
      );
    };

    // Optional fields become null when empty, "-" or "_"
    const getOptionalValue = (
      row: unknown[],
      column: string,
    ): string | null => {
      const value = getCellValue(row, column);

      return isValidValue(value) ? value : null;
    };

    // Read Excel data rows
    const branchRows = rows
      .slice(headerRowIndex + 1)
      .filter((row) =>
        row.some((cell) => String(cell ?? '').trim() !== ''),
      );

    if (!branchRows.length) {
      throw new BadRequestException(
        'Excel file contains no branch records.',
      );
    }

    // Prepare records and skip rows with invalid mandatory values
    const records = branchRows
      .map((row) => {
        const corporate = getCellValue(row, 'Corporate');
        const corporateName = getCellValue(row, 'Corporate Name');
        const branchCode = getCellValue(row, 'Branch Code');

        // Skip this row if any mandatory value is missing or invalid
        if (
          !isValidValue(corporate) ||
          !isValidValue(corporateName) ||
          !isValidValue(branchCode)
        ) {
          return null;
        }

        return {
          corporate,
          corporateName,
          branchCode,
          branchName: getOptionalValue(row, 'Branch Name'),
          network: getOptionalValue(row, 'Network'),
          zone: getOptionalValue(row, 'Zone'),
          region: getOptionalValue(row, 'Region'),
          sbiGiBranch: getOptionalValue(row, 'SBI GI Branch'),
          circle: getOptionalValue(row, 'Circle'),
        };
      })
      .filter((record) => record !== null);

    if (!records.length) {
      throw new BadRequestException(
        'No valid branch records found in the Excel file.',
      );
    }

    // Check Corporate code/name consistency
// Check Corporate code/name consistency (case-insensitive)
const bankNames = new Map<string, string>();

for (const record of records) {
  const existingName = bankNames.get(record.corporate);

  if (
    existingName &&
    existingName.trim().toLowerCase() !==
      record.corporateName.trim().toLowerCase()
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

        // Find or create bank using Corporate as bank_code
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

        // Insert/update branch using bankId + branchCode
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
        skippedRows: branchRows.length - records.length,
      };
    });

    return {
      success: true,
      message: 'Bank and Branch Master uploaded successfully.',
      summary: result,
    };
  }
}
