import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserProviderKeys1710800000000 implements MigrationInterface {
  name = "AddUserProviderKeys1710800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for AI providers
    await queryRunner.query(`
      CREATE TYPE "ai_provider_enum" AS ENUM ('openai', 'anthropic', 'gemini', 'huggingface')
    `);

    // Create the user_provider_keys table
    await queryRunner.query(`
      CREATE TABLE "user_provider_keys" (
        "id"               uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "userId"           uuid              NOT NULL,
        "provider"         "ai_provider_enum" NOT NULL,
        "encryptedApiKey"  text              NOT NULL,
        "keyHint"          varchar(4)        NOT NULL,
        "keyVersion"       integer           NOT NULL DEFAULT 1,
        "isActive"         boolean           NOT NULL DEFAULT true,
        "lastUsedAt"       timestamp         NULL,
        "lastValidatedAt"  timestamp         NULL,
        "createdAt"        timestamp         NOT NULL DEFAULT now(),
        "updatedAt"        timestamp         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_provider_keys" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_provider_keys_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_user_provider_keys_user_provider"
          UNIQUE ("userId", "provider")
      )
    `);

    // Index for fast lookups by userId
    await queryRunner.query(`
      CREATE INDEX "IDX_user_provider_keys_userId" ON "user_provider_keys" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_user_provider_keys_userId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "user_provider_keys"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ai_provider_enum"`);
  }
}
