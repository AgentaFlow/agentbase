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
import { Application } from './application.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 64 })
  keyHash: string;

  /** First 8 chars shown in UI for identification */
  @Column({ length: 12 })
  keyPrefix: string;

  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({ type: 'uuid', nullable: true })
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column({
    type: 'simple-array',
    default: 'chat,conversations',
  })
  scopes: string[];

  @Column({ type: 'int', default: 100 })
  rateLimit: number; // requests per minute

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'bigint', default: 0 })
  totalRequests: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
