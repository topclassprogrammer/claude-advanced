import { IsEmail, MaxLength, MinLength } from 'class-validator';

const MAX_PASSWORD_LENGTH = 72;

export class RegisterDto {
  @IsEmail()
  email: string;

  @MinLength(6)
  @MaxLength(MAX_PASSWORD_LENGTH)
  password: string;
}
