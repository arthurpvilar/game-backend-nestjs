import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Player } from '../players/player.entity.js';
import type { Match } from './match.entity.js';

@Entity('match_participants')
export class MatchParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne('Match', 'participants', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'matchId' })
  match: Match;

  @Index()
  @Column({ type: 'varchar' })
  playerId: string;

  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playerId' })
  player: Player;

  @Column({ type: 'varchar', length: 16 })
  team: string;

  @Column({ type: 'int', default: 0 })
  kills: number;

  @Column({ type: 'int', default: 0 })
  deaths: number;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'boolean', default: false })
  won: boolean;
}
