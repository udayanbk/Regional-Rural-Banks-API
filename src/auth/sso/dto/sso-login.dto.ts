import { IsEmail, IsString, MaxLength } from 'class-validator';

export class SsoLoginDto {
  @IsEmail()
  @MaxLength(190)
  email: string;

  @IsString()
  @MaxLength(128)
  password: string;
}