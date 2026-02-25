import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTenancyColumns1708400000000 implements MigrationInterface {
  name = "AddTenancyColumns1708400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =========================================================
    // 1. Add new columns to teams table for multi-tenancy
    // =========================================================
    await queryRunner.query(
      `ALTER TABLE "teams" ADD COLUMN "plan" varchar NOT NULL DEFAULT 'free' CHECK ("plan" IN ('free', 'starter', 'pro', 'enterprise'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ADD COLUMN "featureFlags" jsonb NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ADD COLUMN "storageUsedBytes" bigint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ADD COLUMN "isPersonal" boolean NOT NULL DEFAULT false`,
    );

    // =========================================================
    // 2. Add teamId FK to applications
    // =========================================================
    await queryRunner.query(
      `ALTER TABLE "applications" ADD COLUMN "teamId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "FK_applications_teamId" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_applications_teamId" ON "applications"("teamId")`,
    );

    // =========================================================
    // 3. Add teamId FK to api_keys
    // =========================================================
    await queryRunner.query(`ALTER TABLE "api_keys" ADD COLUMN "teamId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD CONSTRAINT "FK_api_keys_teamId" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_api_keys_teamId" ON "api_keys"("teamId")`,
    );

    // =========================================================
    // 4. Add teamId FK to webhooks
    // =========================================================
    await queryRunner.query(`ALTER TABLE "webhooks" ADD COLUMN "teamId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "webhooks" ADD CONSTRAINT "FK_webhooks_teamId" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_webhooks_teamId" ON "webhooks"("teamId")`,
    );

    // =========================================================
    // 5. Add teamId FK to subscriptions + failedPaymentCount
    // =========================================================
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD COLUMN "teamId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_subscriptions_teamId" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_teamId" ON "subscriptions"("teamId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD COLUMN "failedPaymentCount" int NOT NULL DEFAULT 0`,
    );

    // =========================================================
    // 6. Add teamId FK to custom_domains
    // =========================================================
    await queryRunner.query(
      `ALTER TABLE "custom_domains" ADD COLUMN "teamId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_domains" ADD CONSTRAINT "FK_custom_domains_teamId" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_custom_domains_teamId" ON "custom_domains"("teamId")`,
    );

    // =========================================================
    // 7. Add teamId FK to brandings
    // =========================================================
    await queryRunner.query(`ALTER TABLE "brandings" ADD COLUMN "teamId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "brandings" ADD CONSTRAINT "FK_brandings_teamId" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_brandings_teamId" ON "brandings"("teamId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // brandings
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_brandings_teamId"`);
    await queryRunner.query(
      `ALTER TABLE "brandings" DROP CONSTRAINT IF EXISTS "FK_brandings_teamId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "brandings" DROP COLUMN IF EXISTS "teamId"`,
    );

    // custom_domains
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_custom_domains_teamId"`);
    await queryRunner.query(
      `ALTER TABLE "custom_domains" DROP CONSTRAINT IF EXISTS "FK_custom_domains_teamId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_domains" DROP COLUMN IF EXISTS "teamId"`,
    );

    // subscriptions
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "failedPaymentCount"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subscriptions_teamId"`);
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "FK_subscriptions_teamId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "teamId"`,
    );

    // webhooks
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_webhooks_teamId"`);
    await queryRunner.query(
      `ALTER TABLE "webhooks" DROP CONSTRAINT IF EXISTS "FK_webhooks_teamId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhooks" DROP COLUMN IF EXISTS "teamId"`,
    );

    // api_keys
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_api_keys_teamId"`);
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP CONSTRAINT IF EXISTS "FK_api_keys_teamId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP COLUMN IF EXISTS "teamId"`,
    );

    // applications
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_applications_teamId"`);
    await queryRunner.query(
      `ALTER TABLE "applications" DROP CONSTRAINT IF EXISTS "FK_applications_teamId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" DROP COLUMN IF EXISTS "teamId"`,
    );

    // teams
    await queryRunner.query(
      `ALTER TABLE "teams" DROP COLUMN IF EXISTS "isPersonal"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" DROP COLUMN IF EXISTS "storageUsedBytes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" DROP COLUMN IF EXISTS "featureFlags"`,
    );
    await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN IF EXISTS "plan"`);
  }
}
