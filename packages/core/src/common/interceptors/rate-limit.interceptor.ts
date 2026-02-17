import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Simple in-memory rate limiter for API key requests.
 * In production, replace with Redis-backed limiter.
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitInterceptor.name);
  private readonly windowMs = 60_000; // 1 minute
  private readonly store = new Map<string, { count: number; resetAt: number }>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const apiKey = request.apiKey;

    if (!apiKey) return next.handle();

    const key = apiKey.id;
    const limit = apiKey.rateLimit || 100;
    const now = Date.now();

    let entry = this.store.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.store.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', limit);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, limit - entry.count));
    response.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > limit) {
      this.logger.warn(`Rate limit exceeded for API key: ${apiKey.keyPrefix}`);
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    return next.handle();
  }
}
