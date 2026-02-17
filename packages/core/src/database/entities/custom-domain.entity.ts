import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from './user.entity';
import { Application } from './application.entity';

export enum DomainStatus {
  PENDING = 'pending',
  VERIFYING = 'verifying',
  ACTIVE = 'active',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

@Entity('custom_domains')
@Index(['domain'], { unique: true })
export class CustomDomain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  domain: string;

  @Column({ type: 'enum', enum: DomainStatus, default: DomainStatus.PENDING })
  status: DomainStatus;

  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({ type: 'uuid', nullable: true })
  applicationId: string;

  @ManyToOne(() => Application, { nullable: true })
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  // DNS verification
  @Column({ length: 64 })
  verificationToken: string;

  @Column({ nullable: true, length: 20 })
  verificationMethod: string; // 'cname' | 'txt'

  @Column({ default: false })
  verified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastCheckAt: Date;

  @Column({ default: 0 })
  checkAttempts: number;

  // SSL
  @Column({ default: false })
  sslEnabled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  sslExpiresAt: Date;

  @Column({ nullable: true, length: 50 })
  sslProvider: string; // 'letsencrypt' | 'custom'

  // Settings
  @Column({ type: 'jsonb', nullable: true })
  settings: {
    redirectWww?: boolean;
    forceHttps?: boolean;
    customHeaders?: Record<string, string>;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
