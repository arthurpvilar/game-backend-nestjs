import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard, Roles } from '../common/auth.js';
import { ReportMatchDto } from './dto/report-match.dto.js';
import type { Match } from './match.entity.js';
import { type MatchHistoryEntry, MatchesService } from './matches.service.js';

@ApiTags('matches')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  /** Called by the authoritative game server when a match ends. */
  @Post('matches')
  @Roles('server', 'admin')
  report(@Body() dto: ReportMatchDto): Promise<Match> {
    return this.matches.report(dto);
  }

  @Get('players/:id/matches')
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  history(
    @Param('id', ParseUUIDPipe) playerId: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<MatchHistoryEntry[]> {
    return this.matches.history(playerId, Math.min(Math.max(limit, 1), 100));
  }
}
