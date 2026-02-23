import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MongooseModule } from "@nestjs/mongoose";
import { Plugin, InstalledPlugin, Application } from "../../database/entities";
import {
  PluginData,
  PluginDataSchema,
} from "../../database/schemas/plugin-data.schema";
import { PluginsService } from "./plugins.service";
import { PluginsController } from "./plugins.controller";
import { InstalledPluginsController } from "./installed-plugins.controller";
import { InstalledPluginsService } from "./installed-plugins.service";
import { PluginManager } from "./engine/plugin-manager";
import { PluginEndpointRegistry } from "./engine/plugin-endpoint.registry";
import { PluginEndpointController } from "./engine/plugin-endpoint.controller";
import { PluginCronScheduler } from "./engine/plugin-cron.scheduler";
import { PluginDatabaseService } from "./engine/plugin-database.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Plugin, InstalledPlugin, Application]),
    MongooseModule.forFeature([
      { name: PluginData.name, schema: PluginDataSchema },
    ]),
  ],
  controllers: [
    PluginsController,
    InstalledPluginsController,
    PluginEndpointController,
  ],
  providers: [
    PluginsService,
    InstalledPluginsService,
    PluginManager,
    PluginEndpointRegistry,
    PluginCronScheduler,
    PluginDatabaseService,
  ],
  exports: [
    PluginsService,
    InstalledPluginsService,
    PluginManager,
    PluginEndpointRegistry,
    PluginCronScheduler,
    PluginDatabaseService,
  ],
})
export class PluginsModule {}
