import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(data: {
    email: string;
    passwordHash: string;
    displayName?: string;
    githubId?: string;
    googleId?: string;
    avatarUrl?: string;
  }): Promise<User> {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findByGithubId(githubId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { githubId } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { googleId } });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    Object.assign(user, data);
    return this.userRepo.save(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepo.update(id, { lastLoginAt: new Date() });
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find({
      select: ['id', 'email', 'displayName', 'role', 'isActive', 'createdAt'],
    });
  }

  async getStats(userId: string): Promise<{
    applicationCount: number;
    joinedAt: string;
  }> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const appCount = await this.userRepo.manager
      .getRepository('Application')
      .count({ where: { ownerId: userId } });

    return {
      applicationCount: appCount,
      joinedAt: user.createdAt.toISOString(),
    };
  }
}
