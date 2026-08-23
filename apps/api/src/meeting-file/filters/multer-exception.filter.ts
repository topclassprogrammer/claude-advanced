import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const isTooLarge = exception.code === 'LIMIT_FILE_SIZE';
    const status = isTooLarge ? 413 : 400;
    const message = isTooLarge
      ? 'File exceeds the maximum allowed size'
      : 'Invalid file upload';

    response.status(status).json({ statusCode: status, message });
  }
}
