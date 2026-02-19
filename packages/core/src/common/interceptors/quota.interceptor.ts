import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { BillingService } from "../../modules/billing/billing.service";

/**
 * Intercepts AI-related requests and enforces usage quotas.
 * Checks quota BEFORE the request and tracks usage AFTER a successful response.
 *
 * Usage: Apply to controllers/routes that proxy AI requests.
 * Requires the request to have `user.sub` (from JwtAuthGuard).
 */
@Injectable()
export class QuotaInterceptor implements NestInterceptor {
  private readonly logger = new Logger(QuotaInterceptor.name);

  constructor(
    @Inject(BillingService) private readonly billingService: BillingService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Support both JWT auth (user.sub) and API key auth (apiKeyOwner.id)
    const userId = request.user?.sub || request.apiKeyOwner?.id;

    if (!userId) {
      return next.handle();
    }

    // Pre-check: ensure user has remaining quota (check with 0 tokens to see remaining)
    const preCheck = await this.billingService.trackUsage(userId, 0);
    if (!preCheck.allowed) {
      this.logger.warn(
        `Quota exceeded for user ${userId}, remaining: ${preCheck.remaining}`,
      );
      response.setHeader("X-Quota-Remaining", 0);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Usage quota exceeded. Please upgrade your plan.",
          remaining: 0,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Set pre-request quota header
    response.setHeader("X-Quota-Remaining", preCheck.remaining);

    return next.handle().pipe(
      tap(async (data) => {
        // Post-response: track actual token usage from the AI response
        const tokensUsed =
          data?.usage?.total_tokens ||
          data?.usage?.totalTokens ||
          data?.tokens_used ||
          0;

        if (tokensUsed > 0) {
          const result = await this.billingService.trackUsage(
            userId,
            tokensUsed,
          );
          response.setHeader("X-Quota-Remaining", result.remaining);
        }
      }),
    );
  }
}
