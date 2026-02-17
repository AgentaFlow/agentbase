import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SsoConfig } from '../../database/entities/sso-config.entity';
import { SsoService } from './sso.service';
import { SsoController } from './sso.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SsoConfig])],
  controllers: [SsoController],
  providers: [SsoService],
  exports: [SsoService],
})
export class SsoModule {}
