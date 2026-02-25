import { Injectable, Logger } from "@nestjs/common";
import { DataSource, QueryRunner } from "typeorm";

/**
 * Sets the PostgreSQL session variable `app.current_team_id`
 * so that Row-Level Security policies can filter rows automatically.
 *
 * Usage: Call `setTeamContext(teamId)` at the start of a request
 * (typically via TeamScopeInterceptor) to enable RLS filtering.
 */
@Injectable()
export class TenantConnectionService {
  private readonly logger = new Logger(TenantConnectionService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Sets the current team context on a query runner for RLS.
   * Returns the query runner so it can be used for subsequent queries.
   */
  async setTeamContext(
    teamId: string,
    queryRunner?: QueryRunner,
  ): Promise<QueryRunner> {
    const runner = queryRunner || this.dataSource.createQueryRunner();
    if (!queryRunner) {
      await runner.connect();
    }

    await runner.query(`SET LOCAL app.current_team_id = '${teamId}'`);
    return runner;
  }

  /**
   * Clears the team context on a query runner.
   */
  async clearTeamContext(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`RESET app.current_team_id`);
  }
}
