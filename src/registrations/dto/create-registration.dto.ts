import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export enum RegistrationPortal {
  SP = 'SP',
  SSO = 'SSO',
}

export enum RegistrationUserType {
  SP_EMPLOYEE = 'SP_EMPLOYEE',
  LICENSING_USER = 'LICENSING_USER',
  SALES_SUPPORT_OFFICER = 'SALES_SUPPORT_OFFICER',
  REGIONAL_MANAGER = 'REGIONAL_MANAGER',
}

export class CreateRegistrationDto {
  @IsEnum(RegistrationPortal)
  portal: RegistrationPortal;

  @IsEnum(RegistrationUserType)
  userType: RegistrationUserType;

  @IsInt()
  @Min(1)
  bankId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  branchId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  employeeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  employeeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(190)
  position?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  mobileNo?: string;

  @IsEmail()
  @MaxLength(190)
  email: string;
}