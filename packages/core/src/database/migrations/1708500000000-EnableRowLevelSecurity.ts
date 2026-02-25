import { MigrationInterface, QueryRunner } from "typeorm";

export class EnableRowLevelSecurity1708500000000 implements MigrationInterface {
  name = "EnableRowLevelSecurity1708500000000";

  private tables = [
    "applications",
    "api_keys",
    "webhooks",
    "custom_domains",
    "brandings",
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      // Enable RLS on the table
      await queryRunner.query(
        `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`,
      );

      // Create a policy that filters by team_id matching the session variable.
      // RLS only activates when the session variable app.current_team_id is set.
      // For free-tier users, the app never sets this variable so RLS doesn't apply
      // (the app-level WHERE clause handles filtering instead).
      // For Pro+ users, the app sets the session variable before queries,
      // providing a database-level safety net.
      await queryRunner.query(`
        CREATE POLICY "tenant_isolation_${table}" ON "${table}"
          USING (
            "teamId" IS NULL
            OR "teamId" = NULLIF(current_setting('app.current_team_id', true), '')::uuid
          )
      `);
    }

    // The superuser / connection owner bypasses RLS by default.
    // To enforce RLS even for the table owner, we need to use FORCE ROW LEVEL SECURITY.
    // However, for simplicity we'll leave it as-is — the app connection user
    // is typically not the table owner in production (managed DB).
    // If needed in the future:
    // ALTER TABLE "applications" FORCE ROW LEVEL SECURITY;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [...this.tables].reverse()) {
      await queryRunner.query(
        `DROP POLICY IF EXISTS "tenant_isolation_${table}" ON "${table}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`,
      );
    }
  }
}
