import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { Application } from '../../database/entities/application.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { SystemHealthService } from './system-health.service';
import { SystemHealthController } from './system-health.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Application, Subscription])],
  controllers: [SystemHealthController],
  providers: [SystemHealthService],
  exports: [SystemHealthService],
})
export class SystemHealthModule {}
