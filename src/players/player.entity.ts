import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Role } from '../common/auth.js';

@Entity('players')
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 100, select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 16, default: 'player' })
  role: Role;

  @Column({ type: 'int', default: 0 })
  xp: number;

  @CreateDateColumn()
  createdAt: Date;
}
