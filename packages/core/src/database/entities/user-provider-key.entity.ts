import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { User } from "./user.entity";

export enum AiProvider {
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  GEMINI = "gemini",
  HUGGINGFACE = "huggingface",
}

/**
 * Stores a user's own AI provider API key, encrypted at rest with AES-256-GCM.
 * One row per (userId, provider) pair — unique constraint enforced.
 *
 * The raw key is NEVER stored or returned. Only the encrypted value and a
 * 4-char hint (last 4 characters) are persisted.
 */
@Entity("user_provider_keys")
@Unique(["userId", "provider"])
export class UserProviderKey {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "enum", enum: AiProvider })
  provider: AiProvider;

  /** AES-256-GCM ciphertext: `<iv_hex>:<authTag_hex>:<ciphertext_hex>` */
  @Column({ type: "text" })
  encryptedApiKey: string;

  /**
   * Last 4 characters of the raw key for UI display only.
   * Example: "a1b2" displayed as "····a1b2"
   * Not sensitive — cannot reconstruct the key from this.
   */
  @Column({ length: 4 })
  keyHint: string;

  /**
   * Incremented when the encryption master key is rotated.
   * Allows identifying which key version was used to encrypt this row.
   */
  @Column({ type: "int", default: 1 })
  keyVersion: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: "timestamp", nullable: true })
  lastUsedAt: Date | null;

  /** Set when the key was last successfully validated against the provider. */
  @Column({ type: "timestamp", nullable: true })
  lastValidatedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
