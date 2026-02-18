import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type VectorEmbeddingDocument = VectorEmbedding & Document;

@Schema({ collection: "vector_embeddings", timestamps: true })
export class VectorEmbedding {
  @Prop({ required: true, index: true })
  applicationId: string;

  @Prop({ index: true })
  knowledgeBaseId: string;

  @Prop({ index: true })
  documentId: string;

  @Prop({
    required: true,
    enum: ["document", "conversation", "prompt", "custom"],
  })
  sourceType: string;

  @Prop({ required: true })
  sourceId: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [Number], required: true })
  embedding: number[];

  @Prop({ required: true })
  embeddingModel: string;

  @Prop({ required: true })
  dimensions: number;

  @Prop({ default: 0 })
  chunkIndex: number;

  @Prop({ type: Object, default: {} })
  metadata: {
    fileName?: string;
    pageNumber?: number;
    section?: string;
    startChar?: number;
    endChar?: number;
    [key: string]: any;
  };
}

export const VectorEmbeddingSchema =
  SchemaFactory.createForClass(VectorEmbedding);

VectorEmbeddingSchema.index({ applicationId: 1, sourceType: 1, sourceId: 1 });
VectorEmbeddingSchema.index({ applicationId: 1, knowledgeBaseId: 1 });
