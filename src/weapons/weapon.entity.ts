import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Tunable weapon data the client downloads at boot, so balancing ships without a build. */
@Entity('weapons')
export class Weapon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 48, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ type: 'int' })
  damage: number;

  /** Shots per second. */
  @Column({ type: 'real' })
  fireRate: number;

  @Column({ type: 'int' })
  magazineSize: number;

  /** Seconds. */
  @Column({ type: 'real' })
  reloadTime: number;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
