import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { MeetingFile } from '../../generated/prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard';
import { DeleteMeetingFileCommand } from './commands/impl/delete-meeting-file.command';
import { UploadMeetingFileCommand } from './commands/impl/upload-meeting-file.command';
import { buildContentDisposition } from './content-disposition.util';
import { MulterExceptionFilter } from './filters/multer-exception.filter';
import {
  MAX_FILE_SIZE_BYTES,
  MIME_TO_EXTENSION,
  STORAGE_DIR,
} from './meeting-file.constants';
import { MeetingFileRecord, toMeetingFileRecord } from './meeting-file.types';
import { DownloadMeetingFileQuery } from './queries/impl/download-meeting-file.query';
import { GetMeetingFilesQuery } from './queries/impl/get-meeting-files.query';

@UseGuards(JwtAuthGuard)
@Controller('meetings')
export class MeetingFileController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post(':id/files')
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: STORAGE_DIR,
        filename: (_req, file, cb) => {
          const extension = MIME_TO_EXTENSION[file.mimetype] ?? '';
          cb(null, `${randomUUID()}${extension}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) meetingId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<MeetingFileRecord> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const created = await this.commandBus.execute<
      UploadMeetingFileCommand,
      MeetingFile
    >(new UploadMeetingFileCommand(meetingId, file, user.sub));
    return toMeetingFileRecord(created);
  }

  @Get(':id/files')
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) meetingId: string,
  ): Promise<MeetingFileRecord[]> {
    const files = await this.queryBus.execute<
      GetMeetingFilesQuery,
      MeetingFile[]
    >(new GetMeetingFilesQuery(meetingId, user.sub));
    return files.map(toMeetingFileRecord);
  }

  @Get(':id/files/:fileId/download')
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) meetingId: string,
    @Param('fileId', new ParseUUIDPipe()) fileId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.queryBus.execute<
      DownloadMeetingFileQuery,
      MeetingFile
    >(new DownloadMeetingFileQuery(meetingId, fileId, user.sub));
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': buildContentDisposition(file.filename),
    });
    return new StreamableFile(createReadStream(file.storagePath));
  }

  @Delete(':id/files/:fileId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) meetingId: string,
    @Param('fileId', new ParseUUIDPipe()) fileId: string,
  ) {
    return this.commandBus.execute(
      new DeleteMeetingFileCommand(meetingId, fileId, user.sub),
    );
  }
}
