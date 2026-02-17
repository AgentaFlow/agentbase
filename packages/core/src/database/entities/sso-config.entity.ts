import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from './user.entity';

export enum SsoProvider {
  SAML = 'saml',
  OIDC = 'oidc',
}

@Entity('sso_configs')
@Index(['teamId'])
export class SsoConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  teamId: string | null;

  @Column({ type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column({ type: 'enum', enum: SsoProvider })
  provider: SsoProvider;

  @Column({ length: 100 })
  displayName: string;

  @Column({ default: false })
  isEnabled: boolean;

  @Column({ default: false })
  enforced: boolean; // Require SSO for all team members

  // SAML Configuration
  @Column({ nullable: true, type: 'text' })
  samlEntryPoint: string;

  @Column({ nullable: true, type: 'text' })
  samlIssuer: string;

  @Column({ nullable: true, type: 'text' })
  samlCertificate: string;

  @Column({ nullable: true, length: 255 })
  samlCallbackUrl: string;

  // OIDC Configuration
  @Column({ nullable: true, length: 500 })
  oidcDiscoveryUrl: string;

  @Column({ nullable: true, length: 255 })
  oidcClientId: string;

  @Column({ nullable: true, length: 500 })
  oidcClientSecret: string;

  @Column({ nullable: true, type: 'simple-array' })
  oidcScopes: string[];

  // Attribute mapping
  @Column({ type: 'jsonb', nullable: true })
  attributeMapping: {
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    role?: string;
    groups?: string;
  };

  // Provisioning
  @Column({ default: true })
  autoProvision: boolean; // Auto-create users on first SSO login

  @Column({ nullable: true, length: 20 })
  defaultRole: string;

  @Column({ type: 'simple-array', nullable: true })
  allowedDomains: string[]; // Restrict SSO to specific email domains

  // Stats
  @Column({ default: 0 })
  totalLogins: number;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
