import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type KnowledgeBaseDocument = KnowledgeBase & Document;

@Schema({ collection: 'knowledge_bases', timestamps: true })
export class KnowledgeBase {
  @Prop({ required: true, index: true })
  applicationId: string;

  @Prop({ required: true, index: true })
  ownerId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ maxlength: 500 })
  description: string;

  @Prop({ default: 'active', enum: ['active', 'processing', 'error'] })
  status: string;

  @Prop({ default: 0 })
  documentCount: number;

  @Prop({ default: 0 })
  totalChunks: number;

  @Prop({ type: Object, default: {} })
  settings: {
    chunkSize?: number;
    chunkOverlap?: number;
    embeddingModel?: string;
    retrievalTopK?: number;
    similarityThreshold?: number;
  };

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const KnowledgeBaseSchema = SchemaFactory.createForClass(KnowledgeBase);
KnowledgeBaseSchema.index({ applicationId: 1, ownerId: 1 });

// --- Knowledge Document (individual uploaded files) ---

export type KnowledgeDocumentDocument = KnowledgeDoc & Document;

@Schema({ collection: 'knowledge_documents', timestamps: true })
export class KnowledgeDoc {
  @Prop({ required: true, index: true })
  knowledgeBaseId: string;

  @Prop({ required: true })
  fileName: string;

  @Prop()
  fileType: string;

  @Prop({ default: 0 })
  fileSize: number;

  @Prop()
  sourceUrl: string;

  @Prop({ default: 'processing', enum: ['processing', 'ready', 'error'] })
  status: string;

  @Prop({ default: 0 })
  chunkCount: number;

  @Prop()
  errorMessage: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const KnowledgeDocSchema = SchemaFactory.createForClass(KnowledgeDoc);
KnowledgeDocSchema.index({ knowledgeBaseId: 1, status: 1 });

// --- Knowledge Chunk (vector-searchable text segments) ---

export type KnowledgeChunkDocument = KnowledgeChunk & Document;

@Schema({ collection: 'knowledge_chunks', timestamps: true })
export class KnowledgeChunk {
  @Prop({ required: true, index: true })
  knowledgeBaseId: string;

  @Prop({ required: true, index: true })
  documentId: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [Number], default: [] })
  embedding: number[];

  @Prop({ default: 0 })
  chunkIndex: number;

  @Prop({ type: Object })
  metadata: {
    fileName?: string;
    pageNumber?: number;
    section?: string;
    startChar?: number;
    endChar?: number;
  };

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const KnowledgeChunkSchema = SchemaFactory.createForClass(KnowledgeChunk);
KnowledgeChunkSchema.index({ knowledgeBaseId: 1, chunkIndex: 1 });
