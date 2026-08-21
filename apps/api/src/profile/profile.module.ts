import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module';
import { ProfileController } from './profile.controller';
import { GetProfileHandler } from './queries/handlers/get-profile.handler';
import { GetAvatarFileHandler } from './queries/handlers/get-avatar-file.handler';
import { UpdateProfileNameHandler } from './commands/handlers/update-profile-name.handler';
import { UploadAvatarHandler } from './commands/handlers/upload-avatar.handler';
import { DeleteAvatarHandler } from './commands/handlers/delete-avatar.handler';

const CommandHandlers = [
  UpdateProfileNameHandler,
  UploadAvatarHandler,
  DeleteAvatarHandler,
];
const QueryHandlers = [GetProfileHandler, GetAvatarFileHandler];

@Module({
  imports: [CqrsModule, AuthModule],
  controllers: [ProfileController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class ProfileModule {}
