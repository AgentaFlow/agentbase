import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PluginStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  DEPRECATED = 'deprecated',
}

@Entity('plugins')
export class Plugin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  version: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  author: string;

  @Column({ nullable: true })
  authorUrl: string;

  @Column({ nullable: true })
  repositoryUrl: string;

  @Column({ type: 'jsonb', default: {} })
  manifest: {
    hooks?: string[];
    permissions?: string[];
    dependencies?: Record<string, string>;
    settings?: Record<string, any>;
    entryPoint?: string;
  };

  @Column({ type: 'enum', enum: PluginStatus, default: PluginStatus.DRAFT })
  status: PluginStatus;

  @Column({ nullable: true })
  iconUrl: string;

  @Column({ type: 'simple-array', nullable: true })
  screenshots: string[];

  @Column({ type: 'float', default: 0 })
  rating: number;

  @Column({ default: 0 })
  downloadCount: number;

  @Column({ default: false })
  isPaid: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
