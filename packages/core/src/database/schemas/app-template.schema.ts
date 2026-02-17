import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AppTemplateDocument = AppTemplate & Document;

@Schema({ collection: 'app_templates', timestamps: true })
export class AppTemplate {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ maxlength: 1000 })
  description: string;

  @Prop()
  shortDescription: string;

  @Prop()
  icon: string;

  @Prop()
  coverImage: string;

  @Prop({
    required: true,
    enum: ['chatbot', 'assistant', 'agent', 'workflow', 'rag', 'custom'],
  })
  category: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object, required: true })
  config: {
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    provider?: string;
    plugins?: string[];
    knowledgeBaseEnabled?: boolean;
    theme?: string;
    widgetConfig?: Record<string, any>;
  };

  @Prop({ type: Object })
  sampleConversations: Array<{
    title: string;
    messages: Array<{ role: string; content: string }>;
  }>;

  @Prop({ type: Object })
  workflowTemplate: {
    nodes: any[];
    edges: any[];
  };

  @Prop()
  authorId: string;

  @Prop()
  authorName: string;

  @Prop({ default: true })
  isOfficial: boolean;

  @Prop({ default: true })
  isPublished: boolean;

  @Prop({ default: 0 })
  deployCount: number;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ enum: ['free', 'starter', 'pro', 'enterprise'], default: 'free' })
  minPlan: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const AppTemplateSchema = SchemaFactory.createForClass(AppTemplate);
AppTemplateSchema.index({ slug: 1 }, { unique: true });
AppTemplateSchema.index({ category: 1, isPublished: 1 });
AppTemplateSchema.index({ tags: 1 });
