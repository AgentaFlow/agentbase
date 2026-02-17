import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plugin, InstalledPlugin, Application } from '../../database/entities';
import { PluginsService } from './plugins.service';
import { PluginsController } from './plugins.controller';
import { InstalledPluginsController } from './installed-plugins.controller';
import { InstalledPluginsService } from './installed-plugins.service';
import { PluginManager } from './engine/plugin-manager';

@Module({
  imports: [TypeOrmModule.forFeature([Plugin, InstalledPlugin, Application])],
  controllers: [PluginsController, InstalledPluginsController],
  providers: [PluginsService, InstalledPluginsService, PluginManager],
  exports: [PluginsService, InstalledPluginsService, PluginManager],
})
export class PluginsModule {}
