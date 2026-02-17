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

export enum PlanTier {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  TRIALING = 'trialing',
  INCOMPLETE = 'incomplete',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: PlanTier, default: PlanTier.FREE })
  plan: PlanTier;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  /** Stripe customer ID */
  @Column({ nullable: true })
  stripeCustomerId: string;

  /** Stripe subscription ID */
  @Column({ nullable: true })
  stripeSubscriptionId: string;

  /** Stripe price ID for current plan */
  @Column({ nullable: true })
  stripePriceId: string;

  // --- Usage limits per billing cycle ---
  @Column({ type: 'int', default: 10000 })
  tokenLimit: number;

  @Column({ type: 'bigint', default: 0 })
  tokensUsed: number;

  @Column({ type: 'int', default: 3 })
  appLimit: number;

  @Column({ type: 'int', default: 1000 })
  messagesLimit: number;

  @Column({ type: 'int', default: 0 })
  messagesUsed: number;

  @Column({ type: 'int', default: 2 })
  apiKeyLimit: number;

  @Column({ type: 'timestamp', nullable: true })
  currentPeriodStart: Date;

  @Column({ type: 'timestamp', nullable: true })
  currentPeriodEnd: Date;

  @Column({ type: 'timestamp', nullable: true })
  trialEnd: Date;

  @Column({ type: 'timestamp', nullable: true })
  canceledAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
