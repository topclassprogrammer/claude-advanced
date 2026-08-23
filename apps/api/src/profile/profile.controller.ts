import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard';
import { MulterExceptionFilter } from '../meeting-file/filters/multer-exception.filter';
import { GetProfileQuery } from './queries/impl/get-profile.query';
import { GetAvatarFileQuery } from './queries/impl/get-avatar-file.query';
import { UpdateProfileNameCommand } from './commands/impl/update-profile-name.command';
import { UploadAvatarCommand } from './commands/impl/upload-avatar.command';
import { DeleteAvatarCommand } from './commands/impl/delete-avatar.command';
import { ChangePasswordCommand } from './commands/impl/change-password.command';
import { UpdateProfileNameDto } from './dto/update-profile-name.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  AVATAR_MIME_TO_EXTENSION,
  AVATAR_STORAGE_DIR,
  MAX_AVATAR_SIZE_BYTES,
} from './profile.constants';
import type { AvatarFile } from './profile.types';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class ProfileController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('me')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new GetProfileQuery(user.sub));
  }

  @Patch('me/name')
  updateName(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileNameDto,
  ) {
    return this.commandBus.execute(
      new UpdateProfileNameCommand(user.sub, dto.name),
    );
  }

  @Patch('me/password')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.commandBus.execute(
      new ChangePasswordCommand(user.sub, dto.oldPassword, dto.newPassword),
    );
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: AVATAR_STORAGE_DIR,
        filename: (_req, file, cb) => {
          const extension = AVATAR_MIME_TO_EXTENSION[file.mimetype] ?? '';
          cb(null, `${randomUUID()}${extension}`);
        },
      }),
      limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
    }),
  )
  uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.commandBus.execute(new UploadAvatarCommand(user.sub, file));
  }

  @Delete('me/avatar')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAvatar(@CurrentUser() user: AuthenticatedUser) {
    return this.commandBus.execute(new DeleteAvatarCommand(user.sub));
  }

  @Get('me/avatar')
  async getAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const avatar = await this.queryBus.execute<GetAvatarFileQuery, AvatarFile>(
      new GetAvatarFileQuery(user.sub),
    );
    res.set({ 'Content-Type': avatar.mimeType });
    return new StreamableFile(createReadStream(avatar.path));
  }
}
