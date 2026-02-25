import { MigrationInterface, QueryRunner } from "typeorm";

export class FixSchemaDrifts1708300000000 implements MigrationInterface {
  name = "FixSchemaDrifts1708300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =========================================================
    // 1. applications: rename userId -> ownerId to match entity
    // =========================================================
    await queryRunner.query(
      `ALTER TABLE "applications" DROP CONSTRAINT IF EXISTS "FK_applications_userId"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_applications_userId"`);
    await queryRunner.query(
      `ALTER TABLE "applications" RENAME COLUMN "userId" TO "ownerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "FK_applications_ownerId" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_applications_ownerId" ON "applications"("ownerId")`,
    );

    // =========================================================
    // 2. subscriptions: add canceledAt, trialEnd; fix apiKeyLimit default
    // =========================================================
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "canceledAt" timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "trialEnd" timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ALTER COLUMN "apiKeyLimit" SET DEFAULT 2`,
    );
    // Keep cancelAtPeriodEnd for now (backwards compat), it will be dropped in a future migration

    // =========================================================
    // 3. plugins: add reviewCount & category to entity (already in DB)
    //    Nothing to do in DB — we'll update the entity file instead
    // =========================================================

    // =========================================================
    // 4. themes: add missing columns that entity has but migration didn't create
    // =========================================================
    await queryRunner.query(
      `ALTER TABLE "themes" ADD COLUMN IF NOT EXISTS "authorUrl" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" ADD COLUMN IF NOT EXISTS "iconUrl" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" ADD COLUMN IF NOT EXISTS "screenshots" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" ADD COLUMN IF NOT EXISTS "category" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" ADD COLUMN IF NOT EXISTS "isPaid" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" ADD COLUMN IF NOT EXISTS "price" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" ADD COLUMN IF NOT EXISTS "rating" float NOT NULL DEFAULT 0`,
    );

    // =========================================================
    // 5. brandings: add whitelabelEnabled column
    // =========================================================
    await queryRunner.query(
      `ALTER TABLE "brandings" ADD COLUMN IF NOT EXISTS "whitelabelEnabled" boolean NOT NULL DEFAULT false`,
    );

    // =========================================================
    // 6. custom_domains: add sslEnabled column
    // =========================================================
    await queryRunner.query(
      `ALTER TABLE "custom_domains" ADD COLUMN IF NOT EXISTS "sslEnabled" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // custom_domains
    await queryRunner.query(
      `ALTER TABLE "custom_domains" DROP COLUMN IF EXISTS "sslEnabled"`,
    );

    // brandings
    await queryRunner.query(
      `ALTER TABLE "brandings" DROP COLUMN IF EXISTS "whitelabelEnabled"`,
    );

    // themes: drop added columns
    await queryRunner.query(
      `ALTER TABLE "themes" DROP COLUMN IF EXISTS "rating"`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" DROP COLUMN IF EXISTS "price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" DROP COLUMN IF EXISTS "isPaid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" DROP COLUMN IF EXISTS "isActive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" DROP COLUMN IF EXISTS "category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" DROP COLUMN IF EXISTS "screenshots"`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" DROP COLUMN IF EXISTS "iconUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" DROP COLUMN IF EXISTS "authorUrl"`,
    );

    // subscriptions
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ALTER COLUMN "apiKeyLimit" SET DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "trialEnd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "canceledAt"`,
    );

    // applications: revert ownerId -> userId
    await queryRunner.query(
      `ALTER TABLE "applications" DROP CONSTRAINT IF EXISTS "FK_applications_ownerId"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_applications_ownerId"`);
    await queryRunner.query(
      `ALTER TABLE "applications" RENAME COLUMN "ownerId" TO "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "FK_applications_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_applications_userId" ON "applications"("userId")`,
    );
  }
}
