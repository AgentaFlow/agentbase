import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ collection: 'ai_conversations', timestamps: true })
export class Conversation {
  @Prop({ required: true })
  applicationId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ type: String, default: 'Untitled Conversation' })
  title: string;

  @Prop({
    type: [
      {
        role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        metadata: { type: Object, default: {} },
      },
    ],
    default: [],
  })
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;

  @Prop({ type: Object, default: {} })
  metadata: {
    model?: string;
    provider?: string;
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
  };

  @Prop({ default: false })
  isArchived: boolean;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ applicationId: 1, userId: 1 });
ConversationSchema.index({ createdAt: -1 });
