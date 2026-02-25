import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { TenantConnectionService } from "../services/tenant-connection.service";

/**
 * Interceptor that sets the PostgreSQL RLS session variable
 * `app.current_team_id` from the request's `teamId` (set by TeamGuard).
 *
 * Apply AFTER TeamGuard so that `request.teamId` is available.
 *
 * @example
 * @UseGuards(JwtAuthGuard, TeamGuard)
 * @UseInterceptors(TeamScopeInterceptor)
 * @Controller('applications')
 * export class ApplicationsController { ... }
 */
@Injectable()
export class TeamScopeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TeamScopeInterceptor.name);

  constructor(private readonly tenantConnection: TenantConnectionService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const teamId: string | undefined = request.teamId;

    if (!teamId) {
      // No team context — skip RLS scope
      return next.handle();
    }

    // Set RLS context for this request
    const runner = await this.tenantConnection.setTeamContext(teamId);

    return next.handle().pipe(
      tap({
        complete: async () => {
          try {
            await this.tenantConnection.clearTeamContext(runner);
            if (!runner.isReleased) await runner.release();
          } catch {
            // Silently ignore cleanup errors
          }
        },
        error: async () => {
          try {
            await this.tenantConnection.clearTeamContext(runner);
            if (!runner.isReleased) await runner.release();
          } catch {
            // Silently ignore cleanup errors
          }
        },
      }),
    );
  }
}
