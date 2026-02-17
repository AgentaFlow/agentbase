import { Module } from '@nestjs/common';
import { PublicApiController } from '../applications/public-api.controller';
import { ApplicationsModule } from '../applications/applications.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [ApplicationsModule, AnalyticsModule, ApiKeysModule],
  controllers: [PublicApiController],
})
export class PublicApiModule {}
