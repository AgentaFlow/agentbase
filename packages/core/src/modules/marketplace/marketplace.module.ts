import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MongooseModule } from "@nestjs/mongoose";
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

@Module({
  imports: [
    TypeOrmModule.forFeature([Plugin, Theme]),
    MongooseModule.forFeature([
      { name: PluginReview.name, schema: PluginReviewSchema },
      { name: ThemeReview.name, schema: ThemeReviewSchema },
      { name: PluginVersion.name, schema: PluginVersionSchema },
    ]),
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
