import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
import { PlanTier } from "./subscription.entity";

@Entity("teams")
export class Team {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 60 })
  slug: string;

  @Column({ nullable: true, length: 500 })
  description: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ type: "uuid" })
  ownerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "ownerId" })
  owner: User;

  @OneToMany(() => TeamMember, (m) => m.team, { cascade: true })
  members: TeamMember[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: "jsonb", nullable: true })
  settings: {
    defaultProvider?: string;
    sharedApiKeys?: boolean;
    allowMemberInvites?: boolean;
  };

  @Column({
    type: "varchar",
    default: PlanTier.FREE,
  })
  plan: PlanTier;

  @Column({ type: "jsonb", default: {} })
  featureFlags: Record<string, boolean | number>;

  @Column({ type: "bigint", default: 0 })
  storageUsedBytes: number;

  @Column({ default: false })
  isPersonal: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export enum TeamRole {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
  VIEWER = "viewer",
}

@Entity("team_members")
export class TeamMember {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  teamId: string;

  @ManyToOne(() => Team, (t) => t.members, { onDelete: "CASCADE" })
  @JoinColumn({ name: "teamId" })
  team: Team;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "enum", enum: TeamRole, default: TeamRole.MEMBER })
  role: TeamRole;

  @Column({ nullable: true })
  invitedBy: string;

  @Column({ type: "timestamp", nullable: true })
  joinedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
