import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard';
import { GetProfileQuery } from './queries/impl/get-profile.query';
import { UpdateProfileNameCommand } from './commands/impl/update-profile-name.command';
import { UpdateProfileNameDto } from './dto/update-profile-name.dto';

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
}
