import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Theme } from '../../database/entities';
import { ThemesService } from './themes.service';
import { ThemesController } from './themes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Theme])],
  controllers: [ThemesController],
  providers: [ThemesService],
  exports: [ThemesService],
})
export class ThemesModule {}
