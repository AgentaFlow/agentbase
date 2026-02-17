import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Application } from './application.entity';
import { Plugin } from './plugin.entity';

export enum InstalledPluginStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
}

@Entity('installed_plugins')
@Unique(['applicationId', 'pluginId'])
export class InstalledPlugin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column()
  applicationId: string;

  @ManyToOne(() => Plugin, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pluginId' })
  plugin: Plugin;

  @Column()
  pluginId: string;

  @Column({
    type: 'enum',
    enum: InstalledPluginStatus,
    default: InstalledPluginStatus.ACTIVE,
  })
  status: InstalledPluginStatus;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @Column({ default: 0 })
  executionOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
