import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Player } from '../players/player.entity.js';

export const QUEST_EVENTS = ['kill', 'match_played', 'match_won'] as const;
export type QuestEventType = (typeof QUEST_EVENTS)[number];

@Entity('quests')
export class Quest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 48, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 96 })
  title: string;

  /** Gameplay event that advances this quest. */
  @Column({ type: 'varchar', length: 24 })
  eventType: QuestEventType;

  @Column({ type: 'int' })
  target: number;

  @Column({ type: 'int', default: 0 })
  rewardXp: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}

@Entity('quest_progress')
@Unique(['playerId', 'questId'])
export class QuestProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  playerId: string;

  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playerId' })
  player: Player;

  @Column({ type: 'varchar' })
  questId: string;

  @ManyToOne(() => Quest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questId' })
  quest: Quest;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'boolean', default: false })
  completed: boolean;

  /** Doubles as the completion time: a completed row is never written again. */
  @UpdateDateColumn()
  updatedAt: Date;
}
