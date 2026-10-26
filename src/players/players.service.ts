import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchParticipant } from '../matches/match-participant.entity.js';
import { Player } from './player.entity.js';

export interface PlayerStats {
  matches: number;
  wins: number;
  kills: number;
  deaths: number;
  killDeathRatio: number;
}

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player) private readonly players: Repository<Player>,
    @InjectRepository(MatchParticipant)
    private readonly participants: Repository<MatchParticipant>,
  ) {}

  async findById(id: string): Promise<Player> {
    const player = await this.players.findOneBy({ id });
    if (!player) throw new NotFoundException(`Player ${id} not found`);
    return player;
  }

  async getStats(playerId: string): Promise<PlayerStats> {
    await this.findById(playerId);
    const row = await this.participants
      .createQueryBuilder('p')
      .select('COUNT(*)', 'matches')
      .addSelect(
        'COALESCE(SUM(CASE WHEN p.won = :won THEN 1 ELSE 0 END), 0)',
        'wins',
      )
      .addSelect('COALESCE(SUM(p.kills), 0)', 'kills')
      .addSelect('COALESCE(SUM(p.deaths), 0)', 'deaths')
      .where('p.playerId = :playerId', { playerId, won: true })
      .getRawOne<
        Record<keyof Omit<PlayerStats, 'killDeathRatio'>, string | number>
      >();

    const matches = Number(row?.matches ?? 0);
    const wins = Number(row?.wins ?? 0);
    const kills = Number(row?.kills ?? 0);
    const deaths = Number(row?.deaths ?? 0);
    const killDeathRatio =
      deaths === 0 ? kills : Math.round((kills / deaths) * 100) / 100;
    return { matches, wins, kills, deaths, killDeathRatio };
  }

  async addXp(playerId: string, amount: number): Promise<void> {
    if (amount > 0)
      await this.players.increment({ id: playerId }, 'xp', amount);
  }
}
