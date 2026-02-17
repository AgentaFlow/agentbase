import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1708192000000 implements MigrationInterface {
  name = 'InitialSchema1708192000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar NOT NULL UNIQUE,
        "passwordHash" varchar NOT NULL,
        "displayName" varchar,
        "avatarUrl" varchar,
        "role" varchar NOT NULL DEFAULT 'user' CHECK ("role" IN ('admin', 'developer', 'user')),
        "isActive" boolean NOT NULL DEFAULT true,
        "githubId" varchar,
        "googleId" varchar,
        "lastLoginAt" timestamp,
        "refreshToken" varchar,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create applications table
    await queryRunner.query(`
      CREATE TABLE "applications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "description" varchar,
        "slug" varchar,
        "status" varchar NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft', 'active', 'paused', 'archived')),
        "config" jsonb NOT NULL DEFAULT '{}',
        "customDomain" varchar,
        "userId" uuid NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_applications_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create plugins table
    await queryRunner.query(`
      CREATE TABLE "plugins" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL UNIQUE,
        "slug" varchar NOT NULL UNIQUE,
        "version" varchar NOT NULL,
        "description" varchar,
        "author" varchar,
        "authorUrl" varchar,
        "repositoryUrl" varchar,
        "manifest" jsonb NOT NULL DEFAULT '{}',
        "status" varchar NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft', 'published', 'deprecated')),
        "iconUrl" varchar,
        "screenshots" text,
        "rating" float NOT NULL DEFAULT 0,
        "reviewCount" int NOT NULL DEFAULT 0,
        "downloadCount" int NOT NULL DEFAULT 0,
        "category" varchar,
        "isPaid" boolean NOT NULL DEFAULT false,
        "price" numeric(10,2),
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create themes table
    await queryRunner.query(`
      CREATE TABLE "themes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL UNIQUE,
        "slug" varchar NOT NULL UNIQUE,
        "version" varchar NOT NULL,
        "description" varchar,
        "author" varchar,
        "previewUrl" varchar,
        "manifest" jsonb NOT NULL DEFAULT '{}',
        "defaultStyles" jsonb NOT NULL DEFAULT '{}',
        "isBuiltIn" boolean NOT NULL DEFAULT false,
        "downloadCount" int NOT NULL DEFAULT 0,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create subscriptions table
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "plan" varchar NOT NULL DEFAULT 'free' CHECK ("plan" IN ('free', 'starter', 'pro', 'enterprise')),
        "status" varchar NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),
        "stripeCustomerId" varchar,
        "stripeSubscriptionId" varchar,
        "stripePriceId" varchar,
        "tokenLimit" int NOT NULL DEFAULT 10000,
        "tokensUsed" bigint NOT NULL DEFAULT 0,
        "appLimit" int NOT NULL DEFAULT 3,
        "messagesLimit" int NOT NULL DEFAULT 1000,
        "messagesUsed" int NOT NULL DEFAULT 0,
        "apiKeyLimit" int NOT NULL DEFAULT 1,
        "currentPeriodStart" timestamp,
        "currentPeriodEnd" timestamp,
        "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_subscriptions_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create installed_plugins table
    await queryRunner.query(`
      CREATE TABLE "installed_plugins" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "applicationId" uuid NOT NULL,
        "pluginId" uuid NOT NULL,
        "status" varchar NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'inactive', 'error')),
        "settings" jsonb NOT NULL DEFAULT '{}',
        "installCount" int NOT NULL DEFAULT 0,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_installed_plugins_applicationId" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_installed_plugins_pluginId" FOREIGN KEY ("pluginId") REFERENCES "plugins"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_installed_plugins_app_plugin" UNIQUE ("applicationId", "pluginId")
      )
    `);

    // Create api_keys table
    await queryRunner.query(`
      CREATE TABLE "api_keys" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "keyHash" varchar(64) NOT NULL UNIQUE,
        "keyPrefix" varchar(12) NOT NULL,
        "ownerId" uuid NOT NULL,
        "applicationId" uuid,
        "scopes" text NOT NULL DEFAULT 'chat,conversations',
        "rateLimit" int NOT NULL DEFAULT 100,
        "isActive" boolean NOT NULL DEFAULT true,
        "expiresAt" timestamp,
        "lastUsedAt" timestamp,
        "totalRequests" bigint NOT NULL DEFAULT 0,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_api_keys_ownerId" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_api_keys_applicationId" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE
      )
    `);

    // Create webhooks table
    await queryRunner.query(`
      CREATE TABLE "webhooks" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ownerId" uuid NOT NULL,
        "applicationId" uuid,
        "name" varchar(200) NOT NULL,
        "url" varchar NOT NULL,
        "secret" varchar,
        "events" text NOT NULL DEFAULT 'message.sent,conversation.started',
        "isActive" boolean NOT NULL DEFAULT true,
        "lastTriggeredAt" timestamp,
        "totalDeliveries" int NOT NULL DEFAULT 0,
        "failedDeliveries" int NOT NULL DEFAULT 0,
        "lastError" varchar,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_webhooks_ownerId" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_webhooks_applicationId" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE
      )
    `);

    // Create teams table
    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "slug" varchar(60) NOT NULL UNIQUE,
        "description" varchar(500),
        "avatarUrl" varchar,
        "ownerId" uuid NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "settings" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_teams_ownerId" FOREIGN KEY ("ownerId") REFERENCES "users"("id")
      )
    `);

    // Create team_members table
    await queryRunner.query(`
      CREATE TABLE "team_members" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "teamId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" varchar NOT NULL DEFAULT 'member' CHECK ("role" IN ('owner', 'admin', 'member', 'viewer')),
        "invitedBy" varchar,
        "joinedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_team_members_teamId" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_team_members_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_team_members_team_user" UNIQUE ("teamId", "userId")
      )
    `);

    // Create custom_domains table
    await queryRunner.query(`
      CREATE TABLE "custom_domains" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "domain" varchar(255) NOT NULL UNIQUE,
        "status" varchar NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'verifying', 'active', 'failed', 'expired')),
        "ownerId" uuid NOT NULL,
        "applicationId" uuid,
        "verificationToken" varchar(64) NOT NULL,
        "verificationMethod" varchar(20),
        "verified" boolean NOT NULL DEFAULT false,
        "verifiedAt" timestamp,
        "lastCheckAt" timestamp,
        "checkAttempts" int NOT NULL DEFAULT 0,
        "sslProvider" varchar,
        "sslExpiresAt" timestamp,
        "sslAutoRenew" boolean NOT NULL DEFAULT true,
        "settings" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_custom_domains_ownerId" FOREIGN KEY ("ownerId") REFERENCES "users"("id"),
        CONSTRAINT "FK_custom_domains_applicationId" FOREIGN KEY ("applicationId") REFERENCES "applications"("id")
      )
    `);

    // Create brandings table
    await queryRunner.query(`
      CREATE TABLE "brandings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ownerId" uuid NOT NULL,
        "companyName" varchar(100),
        "logoUrl" varchar(255),
        "faviconUrl" varchar(255),
        "primaryColor" varchar(7),
        "secondaryColor" varchar(7),
        "accentColor" varchar(7),
        "backgroundColor" varchar(7),
        "textColor" varchar(7),
        "fontFamily" varchar(100),
        "headingFont" varchar(100),
        "widgetConfig" jsonb,
        "emailConfig" jsonb,
        "customCss" text,
        "showPoweredBy" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_brandings_ownerId" FOREIGN KEY ("ownerId") REFERENCES "users"("id")
      )
    `);

    // Create sso_configs table
    await queryRunner.query(`
      CREATE TABLE "sso_configs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "teamId" uuid,
        "createdBy" uuid NOT NULL,
        "provider" varchar NOT NULL CHECK ("provider" IN ('saml', 'oidc')),
        "displayName" varchar(100) NOT NULL,
        "isEnabled" boolean NOT NULL DEFAULT false,
        "enforced" boolean NOT NULL DEFAULT false,
        "samlEntryPoint" text,
        "samlIssuer" text,
        "samlCertificate" text,
        "samlCallbackUrl" varchar(255),
        "oidcDiscoveryUrl" varchar(500),
        "oidcClientId" varchar(255),
        "oidcClientSecret" varchar(500),
        "oidcScopes" text,
        "attributeMapping" jsonb,
        "autoProvision" boolean NOT NULL DEFAULT true,
        "allowedDomains" text,
        "totalLogins" int NOT NULL DEFAULT 0,
        "lastLoginAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_sso_configs_createdBy" FOREIGN KEY ("createdBy") REFERENCES "users"("id")
      )
    `);

    // Create indexes for better query performance
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users"("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_applications_userId" ON "applications"("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_applications_slug" ON "applications"("slug")`);
    await queryRunner.query(`CREATE INDEX "IDX_subscriptions_userId" ON "subscriptions"("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_api_keys_ownerId" ON "api_keys"("ownerId")`);
    await queryRunner.query(`CREATE INDEX "IDX_api_keys_applicationId" ON "api_keys"("applicationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_webhooks_ownerId" ON "webhooks"("ownerId")`);
    await queryRunner.query(`CREATE INDEX "IDX_webhooks_applicationId" ON "webhooks"("applicationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_teams_slug" ON "teams"("slug")`);
    await queryRunner.query(`CREATE INDEX "IDX_team_members_teamId" ON "team_members"("teamId")`);
    await queryRunner.query(`CREATE INDEX "IDX_team_members_userId" ON "team_members"("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_custom_domains_domain" ON "custom_domains"("domain")`);
    await queryRunner.query(`CREATE INDEX "IDX_brandings_ownerId" ON "brandings"("ownerId")`);
    await queryRunner.query(`CREATE INDEX "IDX_sso_configs_teamId" ON "sso_configs"("teamId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_sso_configs_teamId"`);
    await queryRunner.query(`DROP INDEX "IDX_brandings_ownerId"`);
    await queryRunner.query(`DROP INDEX "IDX_custom_domains_domain"`);
    await queryRunner.query(`DROP INDEX "IDX_team_members_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_team_members_teamId"`);
    await queryRunner.query(`DROP INDEX "IDX_teams_slug"`);
    await queryRunner.query(`DROP INDEX "IDX_webhooks_applicationId"`);
    await queryRunner.query(`DROP INDEX "IDX_webhooks_ownerId"`);
    await queryRunner.query(`DROP INDEX "IDX_api_keys_applicationId"`);
    await queryRunner.query(`DROP INDEX "IDX_api_keys_ownerId"`);
    await queryRunner.query(`DROP INDEX "IDX_subscriptions_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_applications_slug"`);
    await queryRunner.query(`DROP INDEX "IDX_applications_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_users_email"`);

    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE "sso_configs"`);
    await queryRunner.query(`DROP TABLE "brandings"`);
    await queryRunner.query(`DROP TABLE "custom_domains"`);
    await queryRunner.query(`DROP TABLE "team_members"`);
    await queryRunner.query(`DROP TABLE "teams"`);
    await queryRunner.query(`DROP TABLE "webhooks"`);
    await queryRunner.query(`DROP TABLE "api_keys"`);
    await queryRunner.query(`DROP TABLE "installed_plugins"`);
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(`DROP TABLE "themes"`);
    await queryRunner.query(`DROP TABLE "plugins"`);
    await queryRunner.query(`DROP TABLE "applications"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
