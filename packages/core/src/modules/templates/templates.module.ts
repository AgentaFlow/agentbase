import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppTemplate, AppTemplateSchema } from '../../database/schemas/app-template.schema';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AppTemplate.name, schema: AppTemplateSchema }]),
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
