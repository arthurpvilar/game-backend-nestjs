import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MatchParticipant } from './match-participant.entity.js';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32 })
  mode: string;

  @Column({ type: 'varchar', length: 48 })
  map: string;

  @Column({ type: 'int' })
  durationSeconds: number;

  /** Null on a draw. */
  @Column({ type: 'varchar', length: 16, nullable: true })
  winnerTeam: string | null;

  /** When the game server reported the result. */
  @CreateDateColumn()
  playedAt: Date;

  @OneToMany(() => MatchParticipant, (participant) => participant.match, {
    cascade: true,
  })
  participants: MatchParticipant[];
}
