import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('brandings')
@Index(['ownerId'])
export class Branding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({ nullable: true, length: 100 })
  companyName: string;

  @Column({ nullable: true, length: 255 })
  logoUrl: string;

  @Column({ nullable: true, length: 255 })
  faviconUrl: string;

  // Color scheme
  @Column({ nullable: true, length: 7 })
  primaryColor: string;

  @Column({ nullable: true, length: 7 })
  secondaryColor: string;

  @Column({ nullable: true, length: 7 })
  accentColor: string;

  @Column({ nullable: true, length: 7 })
  backgroundColor: string;

  @Column({ nullable: true, length: 7 })
  textColor: string;

  // Typography
  @Column({ nullable: true, length: 100 })
  fontFamily: string;

  @Column({ nullable: true, length: 100 })
  headingFont: string;

  // Widget customization
  @Column({ type: 'jsonb', nullable: true })
  widgetConfig: {
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    borderRadius?: number;
    showPoweredBy?: boolean;
    welcomeMessage?: string;
    placeholder?: string;
    headerText?: string;
    avatarUrl?: string;
  };

  // Email customization
  @Column({ type: 'jsonb', nullable: true })
  emailConfig: {
    fromName?: string;
    replyTo?: string;
    headerLogoUrl?: string;
    footerText?: string;
    accentColor?: string;
  };

  // Custom CSS injection
  @Column({ type: 'text', nullable: true })
  customCss: string;

  // Feature flags per brand
  @Column({ default: true })
  showPoweredBy: boolean;

  @Column({ default: false })
  whitelabelEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
