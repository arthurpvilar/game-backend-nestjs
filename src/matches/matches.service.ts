import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Player } from '../players/player.entity.js';
import { QuestsService } from '../quests/quests.service.js';
import type { ReportMatchDto } from './dto/report-match.dto.js';
import { MatchParticipant } from './match-participant.entity.js';
import { Match } from './match.entity.js';

export interface MatchHistoryEntry {
  matchId: string;
  mode: string;
  map: string;
  playedAt: Date;
  durationSeconds: number;
  team: string;
  won: boolean;
  kills: number;
  deaths: number;
  score: number;
}

@Injectable()
export class MatchesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(MatchParticipant)
    private readonly participants: Repository<MatchParticipant>,
    private readonly quests: QuestsService,
  ) {}

  /** Persists a finished match atomically, then feeds the results into the quest system. */
  async report(dto: ReportMatchDto): Promise<Match> {
    const playerIds = dto.participants.map((p) => p.playerId);
    if (new Set(playerIds).size !== playerIds.length) {
      throw new BadRequestException('A player can only appear once per match');
    }

    const match = await this.dataSource.transaction(async (manager) => {
      const known = await manager.countBy(Player, { id: In(playerIds) });
      if (known !== playerIds.length)
        throw new BadRequestException('Unknown player in results');

      return manager.save(
        manager.create(Match, {
          mode: dto.mode,
          map: dto.map,
          durationSeconds: dto.durationSeconds,
          winnerTeam: dto.winnerTeam ?? null,
          participants: dto.participants.map(
            ({ playerId, team, kills, deaths, score }) =>
              manager.create(MatchParticipant, {
                playerId,
                team,
                kills,
                deaths,
                score,
                won: team === dto.winnerTeam,
              }),
          ),
        }),
      );
    });

    // Quests run after commit: a quest failure must never roll back a recorded match.
    for (const p of match.participants) {
      await this.quests.applyEvent(p.playerId, 'match_played');
      if (p.kills > 0)
        await this.quests.applyEvent(p.playerId, 'kill', p.kills);
      if (p.won) await this.quests.applyEvent(p.playerId, 'match_won');
    }
    return match;
  }

  async history(playerId: string, limit: number): Promise<MatchHistoryEntry[]> {
    const rows = await this.participants.find({
      where: { playerId },
      relations: { match: true },
      order: { match: { playedAt: 'DESC' } },
      take: limit,
    });
    return rows.map(({ match, team, won, kills, deaths, score }) => ({
      matchId: match.id,
      mode: match.mode,
      map: match.map,
      playedAt: match.playedAt,
      durationSeconds: match.durationSeconds,
      team,
      won,
      kills,
      deaths,
      score,
    }));
  }
}
