import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const MAX_NAME_LENGTH = 100;

export class UpdateProfileNameDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_NAME_LENGTH)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name: string;
}
