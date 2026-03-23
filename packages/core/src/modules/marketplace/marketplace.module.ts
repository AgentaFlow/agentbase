import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Plugin, Theme } from "../../database/entities";
import {
  PluginReview,
  PluginReviewSchema,
} from "../../database/schemas/plugin-review.schema";
import {
  ThemeReview,
  ThemeReviewSchema,
} from "../../database/schemas/theme-review.schema";
import {
  PluginVersion,
  PluginVersionSchema,
} from "../../database/schemas/plugin-version.schema";
import { MarketplaceService } from "./marketplace.service";
import { MarketplaceController } from "./marketplace.controller";
import { MarketplaceClientService } from "./marketplace-client.service";

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        baseURL: config.get<string>("MARKETPLACE_URL"),
        timeout: 5000,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Plugin, Theme]),
    MongooseModule.forFeature([
      { name: PluginReview.name, schema: PluginReviewSchema },
      { name: ThemeReview.name, schema: ThemeReviewSchema },
      { name: PluginVersion.name, schema: PluginVersionSchema },
    ]),
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, MarketplaceClientService],
  exports: [MarketplaceService, MarketplaceClientService],
})
export class MarketplaceModule {}
