import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RedisService } from '../services/redis.service';

/**
 * Redis-backed rate limiter for public API key requests.
 * Uses a fixed-window counter (INCR + EXPIRE) so the limit is enforced
 * globally across all App Service instances.
 *
 * Falls back to fail-open (no limit enforced) when Redis is unavailable,
 * so a Redis outage does not block legitimate API traffic.
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitInterceptor.name);
  private readonly windowMs = 60_000; // 1 minute

  // In-memory fallback used only when Redis is unavailable.
  private readonly fallbackStore = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly redisService: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const apiKey = request.apiKey;

    if (!apiKey) return next.handle();

    const keyId: string = apiKey.id;
    const limit: number = apiKey.rateLimit || 100;
    const windowSec = Math.ceil(this.windowMs / 1000);

    let count: number;
    let resetAt: number;
    const redis = this.redisService.getClient();

    if (redis) {
      const redisKey = `rl:${keyId}`;
      count = await this.redisService.increment(redisKey, windowSec);
      const ttlSec = await this.redisService.ttl(redisKey);
      resetAt = Math.floor(Date.now() / 1000) + ttlSec;
    } else {
      // Fallback: per-instance in-memory store (best-effort under Redis outage)
      const now = Date.now();
      let entry = this.fallbackStore.get(keyId);
      if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + this.windowMs };
        this.fallbackStore.set(keyId, entry);
      }
      entry.count++;
      count = entry.count;
      resetAt = Math.ceil(entry.resetAt / 1000);
    }

    response.setHeader('X-RateLimit-Limit', limit);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));
    response.setHeader('X-RateLimit-Reset', resetAt);

    if (count > limit) {
      this.logger.warn(`Rate limit exceeded for API key: ${apiKey.keyPrefix}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
          retryAfter: resetAt - Math.floor(Date.now() / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return next.handle();
  }
}
