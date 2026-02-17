import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomDomain } from '../../database/entities/custom-domain.entity';
import { CustomDomainsService } from './custom-domains.service';
import { CustomDomainsController } from './custom-domains.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CustomDomain])],
  controllers: [CustomDomainsController],
  providers: [CustomDomainsService],
  exports: [CustomDomainsService],
})
export class CustomDomainsModule {}
