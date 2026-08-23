import {
  ArrayMaxSize,
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_PARTICIPANT_LENGTH = 255;
const MAX_PARTICIPANTS = 50;

export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_TITLE_LENGTH)
  title: string;

  @IsISO8601()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_DESCRIPTION_LENGTH)
  description?: string;

  @IsArray()
  @ArrayMaxSize(MAX_PARTICIPANTS)
  @IsString({ each: true })
  @MaxLength(MAX_PARTICIPANT_LENGTH, { each: true })
  participants: string[];
}
