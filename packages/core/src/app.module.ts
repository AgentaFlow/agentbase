import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { PluginsModule } from './modules/plugins/plugins.module';
import { ThemesModule } from './modules/themes/themes.module';
import { HealthModule } from './modules/health/health.module';
import { HooksModule } from './modules/hooks/hooks.module';
import { PromptsModule } from './modules/prompts/prompts.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdminModule } from './modules/admin/admin.module';
import { PublicApiModule } from './modules/applications/public-api.module';
import { BillingModule } from './modules/billing/billing.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { EmailModule } from './modules/email/email.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),

    // PostgreSQL via TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('POSTGRES_HOST', 'localhost'),
        port: config.get<number>('POSTGRES_PORT', 5432),
        username: config.get('POSTGRES_USER', 'agentbase'),
        password: config.get('POSTGRES_PASSWORD', 'agentbase_dev'),
        database: config.get('POSTGRES_DB', 'agentbase'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') === 'development',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),

    // MongoDB via Mongoose
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get(
          'MONGO_URI',
          'mongodb://agentbase:agentbase_dev@localhost:27017/agentbase?authSource=admin',
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
  ],
})
export class AppModule {}
