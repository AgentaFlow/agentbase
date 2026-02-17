import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../../database/entities';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
  ) {}

  /**
   * Generate a new API key. Returns the raw key only once.
   */
  async create(ownerId: string, data: {
    name: string;
    applicationId?: string;
    scopes?: string[];
    rateLimit?: number;
  }): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const rawKey = `ab_${randomBytes(28).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 10) + '...';

    const apiKey = this.apiKeyRepo.create({
      name: data.name,
      keyHash,
      keyPrefix,
      ownerId,
      applicationId: data.applicationId || null,
      scopes: data.scopes || ['chat', 'conversations'],
      rateLimit: data.rateLimit || 100,
    });

    const saved = await this.apiKeyRepo.save(apiKey) as ApiKey;
    this.logger.log(`API key created: ${saved.keyPrefix} for user ${ownerId}`);

    return { apiKey: saved, rawKey };
  }

  async findByOwner(ownerId: string): Promise<ApiKey[]> {
    return this.apiKeyRepo.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<ApiKey | null> {
    return this.apiKeyRepo.findOne({ where: { id }, relations: ['application'] });
  }

  async validateKey(rawKey: string): Promise<ApiKey | null> {
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await this.apiKeyRepo.findOne({
      where: { keyHash, isActive: true },
      relations: ['application', 'owner'],
    });

    if (!apiKey) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    // Update usage stats
    await this.apiKeyRepo.update(apiKey.id, {
      lastUsedAt: new Date(),
      totalRequests: () => '"totalRequests" + 1',
    });

    return apiKey;
  }

  async revoke(id: string, ownerId: string): Promise<void> {
    const key = await this.apiKeyRepo.findOne({ where: { id, ownerId } });
    if (!key) throw new NotFoundException('API key not found');
    await this.apiKeyRepo.update(id, { isActive: false });
    this.logger.log(`API key revoked: ${key.keyPrefix}`);
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const result = await this.apiKeyRepo.delete({ id, ownerId });
    if (result.affected === 0) throw new NotFoundException('API key not found');
  }
}
