import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { Application } from '../../database/entities/application.entity';
import { Conversation, ConversationSchema } from '../../database/schemas/conversation.schema';
import { DataExportService } from './data-export.service';
import { DataExportController } from './data-export.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application]),
    MongooseModule.forFeature([{ name: Conversation.name, schema: ConversationSchema }]),
  ],
  controllers: [DataExportController],
  providers: [DataExportService],
  exports: [DataExportService],
})
export class DataExportModule {}
