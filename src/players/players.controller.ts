import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, type AuthUser, CurrentUser } from '../common/auth.js';
import { Player } from './player.entity.js';
import { PlayersService, type PlayerStats } from './players.service.js';

@ApiTags('players')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('players')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<Player> {
    return this.players.findById(user.id);
  }

  @Get(':id/stats')
  stats(@Param('id', ParseUUIDPipe) id: string): Promise<PlayerStats> {
    return this.players.getStats(id);
  }
}
