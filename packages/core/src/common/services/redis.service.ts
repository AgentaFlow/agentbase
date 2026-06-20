import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);
    const password = this.config.get<string>('REDIS_PASSWORD');
    const tls = this.config.get<string>('REDIS_TLS') === 'true';

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      tls: tls ? {} : undefined,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 200, 3000),
      maxRetriesPerRequest: 1,
    });

    this.client.on('error', (err) =>
      this.logger.error('Redis connection error', err.message),
    );
    this.client.on('connect', () =>
      this.logger.log(`Redis connected at ${host}:${port}`),
    );

    this.client.connect().catch((err) =>
      this.logger.warn('Redis initial connect failed — rate limiting will use in-memory fallback', err.message),
    );
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  /** Returns the Redis client, or null if not connected. */
  getClient(): Redis | null {
    return this.client?.status === 'ready' ? this.client : null;
  }

  /** Increment a key and set its TTL on first write (fixed-window counter). */
  async increment(key: string, windowSeconds: number): Promise<number> {
    const redis = this.getClient();
    if (!redis) return 0; // fail open when Redis is unavailable

    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    return count;
  }

  /** Return the remaining TTL (seconds) of a key, or the full window on miss. */
  async ttl(key: string): Promise<number> {
    const redis = this.getClient();
    if (!redis) return 0;
    const t = await redis.ttl(key);
    return t < 0 ? 0 : t;
  }
}
