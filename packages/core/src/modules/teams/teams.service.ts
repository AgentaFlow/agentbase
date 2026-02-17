import { Injectable, Logger, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, TeamMember, TeamRole } from '../../database/entities';
import { UsersService } from '../users/users.service';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
    @InjectRepository(TeamMember) private readonly memberRepo: Repository<TeamMember>,
    private readonly usersService: UsersService,
  ) {}

  async create(ownerId: string, data: { name: string; slug: string; description?: string }): Promise<Team> {
    const exists = await this.teamRepo.findOne({ where: { slug: data.slug } });
    if (exists) throw new ConflictException('Team slug already taken');

    const team = this.teamRepo.create({
      ...data,
      ownerId,
      settings: { sharedApiKeys: true, allowMemberInvites: false },
    });
    const saved = await this.teamRepo.save(team);

    // Add owner as first member
    const member = this.memberRepo.create({
      teamId: saved.id,
      userId: ownerId,
      role: TeamRole.OWNER,
      joinedAt: new Date(),
    });
    await this.memberRepo.save(member);

    this.logger.log(`Team created: ${saved.name} (${saved.slug}) by ${ownerId}`);
    return saved;
  }

  async findByUser(userId: string): Promise<Team[]> {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['team'],
    });
    return memberships.map(m => m.team).filter(Boolean);
  }

  async findById(teamId: string): Promise<Team> {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['members', 'members.user'],
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async findBySlug(slug: string): Promise<Team> {
    const team = await this.teamRepo.findOne({ where: { slug } });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async update(teamId: string, userId: string, data: Partial<Team>): Promise<Team> {
    await this.requireRole(teamId, userId, [TeamRole.OWNER, TeamRole.ADMIN]);
    const team = await this.findById(teamId);
    Object.assign(team, data);
    return this.teamRepo.save(team);
  }

  async delete(teamId: string, userId: string): Promise<void> {
    await this.requireRole(teamId, userId, [TeamRole.OWNER]);
    await this.teamRepo.delete(teamId);
    this.logger.log(`Team ${teamId} deleted by ${userId}`);
  }

  async getMembers(teamId: string): Promise<TeamMember[]> {
    return this.memberRepo.find({
      where: { teamId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async inviteMember(teamId: string, inviterId: string, email: string, role: TeamRole = TeamRole.MEMBER): Promise<TeamMember> {
    await this.requireRole(teamId, inviterId, [TeamRole.OWNER, TeamRole.ADMIN]);

    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found. They must register first.');

    const existing = await this.memberRepo.findOne({ where: { teamId, userId: user.id } });
    if (existing) throw new ConflictException('User is already a team member');

    const member = this.memberRepo.create({
      teamId,
      userId: user.id,
      role,
      invitedBy: inviterId,
      joinedAt: new Date(),
    });
    const saved = await this.memberRepo.save(member);
    this.logger.log(`${email} invited to team ${teamId} as ${role} by ${inviterId}`);
    return saved;
  }

  async removeMember(teamId: string, removerId: string, memberId: string): Promise<void> {
    await this.requireRole(teamId, removerId, [TeamRole.OWNER, TeamRole.ADMIN]);
    const member = await this.memberRepo.findOne({ where: { id: memberId, teamId } });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === TeamRole.OWNER) throw new ForbiddenException('Cannot remove the team owner');
    await this.memberRepo.delete(memberId);
    this.logger.log(`Member ${memberId} removed from team ${teamId} by ${removerId}`);
  }

  async updateMemberRole(teamId: string, updaterId: string, memberId: string, role: TeamRole): Promise<TeamMember> {
    await this.requireRole(teamId, updaterId, [TeamRole.OWNER]);
    const member = await this.memberRepo.findOne({ where: { id: memberId, teamId } });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === TeamRole.OWNER) throw new ForbiddenException('Cannot change owner role');
    member.role = role;
    return this.memberRepo.save(member);
  }

  async isMember(teamId: string, userId: string): Promise<boolean> {
    const count = await this.memberRepo.count({ where: { teamId, userId } });
    return count > 0;
  }

  async getUserRole(teamId: string, userId: string): Promise<TeamRole | null> {
    const member = await this.memberRepo.findOne({ where: { teamId, userId } });
    return member?.role || null;
  }

  private async requireRole(teamId: string, userId: string, roles: TeamRole[]): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { teamId, userId } });
    if (!member || !roles.includes(member.role)) {
      throw new ForbiddenException('Insufficient team permissions');
    }
  }
}
