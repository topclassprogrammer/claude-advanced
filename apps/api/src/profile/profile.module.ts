import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module';
import { ProfileController } from './profile.controller';
import { GetProfileHandler } from './queries/handlers/get-profile.handler';
import { UpdateProfileNameHandler } from './commands/handlers/update-profile-name.handler';

const CommandHandlers = [UpdateProfileNameHandler];
const QueryHandlers = [GetProfileHandler];

@Module({
  imports: [CqrsModule, AuthModule],
  controllers: [ProfileController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class ProfileModule {}
