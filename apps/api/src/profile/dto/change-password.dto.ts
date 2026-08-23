import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

const MAX_PASSWORD_LENGTH = 72;

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_PASSWORD_LENGTH)
  oldPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(MAX_PASSWORD_LENGTH)
  newPassword: string;
}
