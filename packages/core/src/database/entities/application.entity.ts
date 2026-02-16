import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum AppStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  slug: string;

  @Column({ type: 'enum', enum: AppStatus, default: AppStatus.DRAFT })
  status: AppStatus;

  @Column({ type: 'jsonb', default: {} })
  config: {
    aiProvider?: string;
    aiModel?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    enabledPlugins?: string[];
    themeId?: string;
    customSettings?: Record<string, any>;
  };

  @Column({ nullable: true })
  customDomain: string;

  @ManyToOne(() => User, (user) => user.applications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
