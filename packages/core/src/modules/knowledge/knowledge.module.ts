import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import {
  KnowledgeBase, KnowledgeBaseSchema,
  KnowledgeDoc, KnowledgeDocSchema,
  KnowledgeChunk, KnowledgeChunkSchema,
} from '../../database/schemas/knowledge.schema';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: KnowledgeBase.name, schema: KnowledgeBaseSchema },
      { name: KnowledgeDoc.name, schema: KnowledgeDocSchema },
      { name: KnowledgeChunk.name, schema: KnowledgeChunkSchema },
    ]),
    MulterModule.register({
      limits: { fileSize: 10 * 1024 * 1024 },
      storage: require('multer').memoryStorage(),
    }),
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
