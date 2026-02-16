import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plugin } from '../../database/entities';
import { PluginsService } from './plugins.service';
import { PluginsController } from './plugins.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Plugin])],
  controllers: [PluginsController],
  providers: [PluginsService],
  exports: [PluginsService],
})
export class PluginsModule {}
