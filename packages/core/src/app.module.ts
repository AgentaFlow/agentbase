import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MongooseModule } from "@nestjs/mongoose";
import { LoggerModule } from "nestjs-pino";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { ApplicationsModule } from "./modules/applications/applications.module";
import { PluginsModule } from "./modules/plugins/plugins.module";
import { ThemesModule } from "./modules/themes/themes.module";
import { HealthModule } from "./modules/health/health.module";
import { HooksModule } from "./modules/hooks/hooks.module";
import { PromptsModule } from "./modules/prompts/prompts.module";
import { ApiKeysModule } from "./modules/api-keys/api-keys.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AdminModule } from "./modules/admin/admin.module";
import { PublicApiModule } from "./modules/applications/public-api.module";
import { BillingModule } from "./modules/billing/billing.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { MarketplaceModule } from "./modules/marketplace/marketplace.module";
import { EmailModule } from "./modules/email/email.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { AuditModule } from "./modules/audit/audit.module";
import { TeamsModule } from "./modules/teams/teams.module";
import { KnowledgeModule } from "./modules/knowledge/knowledge.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { TemplatesModule } from "./modules/templates/templates.module";
import { WorkflowsModule } from "./modules/workflows/workflows.module";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { CustomDomainsModule } from "./modules/custom-domains/custom-domains.module";
import { BrandingModule } from "./modules/branding/branding.module";
import { SsoModule } from "./modules/sso/sso.module";
import { DataExportModule } from "./modules/data-export/data-export.module";
import { SystemHealthModule } from "./modules/system-health/system-health.module";

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),

    // Structured logging with Pino
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get("NODE_ENV") === "production";
        return {
          pinoHttp: {
            level: isProd ? "info" : "debug",
            transport: isProd
              ? undefined
              : {
                  target: "pino-pretty",
                  options: { colorize: true, singleLine: true },
                },
            autoLogging: true,
            serializers: {
              req: (req: any) => ({ method: req.method, url: req.url }),
              res: (res: any) => ({ statusCode: res.statusCode }),
            },
          },
        };
      },
    }),

    // PostgreSQL via TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        host: config.get("POSTGRES_HOST", "localhost"),
        port: config.get<number>("POSTGRES_PORT", 5432),
        username: config.get("POSTGRES_USER", "agentbase"),
        password: config.get("POSTGRES_PASSWORD", "agentbase_dev"),
        database: config.get("POSTGRES_DB", "agentbase"),
        autoLoadEntities: true,
        synchronize: false, // Use migrations instead
        migrations: ["dist/database/migrations/*.js"],
        migrationsRun: config.get("RUN_MIGRATIONS") === "true",
        logging: config.get("NODE_ENV") === "development",
      }),
    }),

    // MongoDB via Mongoose
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get(
          "MONGO_URI",
          "mongodb://agentbase:agentbase_dev@localhost:27017/agentbase?authSource=admin",
        ),
      }),
    }),

    // Feature modules
    HealthModule,
    HooksModule,
    AuthModule,
    UsersModule,
    ApplicationsModule,
    PluginsModule,
    ThemesModule,
    PromptsModule,
    ApiKeysModule,
    AnalyticsModule,
    AdminModule,
    PublicApiModule,
    BillingModule,
    WebhooksModule,
    MarketplaceModule,
    EmailModule,
    UploadsModule,
    AuditModule,
    TeamsModule,
    KnowledgeModule,
    NotificationsModule,
    TemplatesModule,
    WorkflowsModule,
    ConversationsModule,
    CustomDomainsModule,
    BrandingModule,
    SsoModule,
    DataExportModule,
    SystemHealthModule,
  ],
})
export class AppModule {}
