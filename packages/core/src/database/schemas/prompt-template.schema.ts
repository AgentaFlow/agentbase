import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PromptTemplateDocument = PromptTemplate & Document;

@Schema({ collection: 'prompt_templates', timestamps: true })
export class PromptTemplate {
  @Prop({ required: true })
  applicationId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  template: string;

  @Prop({ type: [String], default: [] })
  variables: string[];

  @Prop({ nullable: true })
  description: string;

  @Prop({ default: false })
  isDefault: boolean;
}

export const PromptTemplateSchema = SchemaFactory.createForClass(PromptTemplate);
