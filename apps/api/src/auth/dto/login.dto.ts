import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

const MAX_PASSWORD_LENGTH = 72;

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_PASSWORD_LENGTH)
  password: string;
}
