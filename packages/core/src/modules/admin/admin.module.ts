import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { ApplicationsModule } from '../applications/applications.module';
import { PluginsModule } from '../plugins/plugins.module';

@Module({
  imports: [UsersModule, ApplicationsModule, PluginsModule],
  controllers: [AdminController],
})
export class AdminModule {}
