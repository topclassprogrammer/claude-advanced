import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { extname } from 'path';
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { MeetingFile } from '../../generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadMeetingFileCommand } from './commands/impl/upload-meeting-file.command';
import { buildContentDisposition } from './content-disposition.util';
import { MAX_FILE_SIZE_BYTES, STORAGE_DIR } from './meeting-file.constants';
import { DownloadMeetingFileQuery } from './queries/impl/download-meeting-file.query';

@UseGuards(JwtAuthGuard)
@Controller('meetings')
export class MeetingFileController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post(':id/file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: STORAGE_DIR,
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  upload(
    @Param('id') meetingId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.commandBus.execute(
      new UploadMeetingFileCommand(meetingId, file),
    );
  }

  @Get(':id/file/download')
  async download(
    @Param('id') meetingId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.queryBus.execute<
      DownloadMeetingFileQuery,
      MeetingFile
    >(new DownloadMeetingFileQuery(meetingId));
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': buildContentDisposition(file.filename),
    });
    return new StreamableFile(createReadStream(file.storagePath));
  }
}
