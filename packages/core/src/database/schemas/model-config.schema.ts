import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ModelConfigDocument = ModelConfig & Document;

@Schema({ collection: "model_configs", timestamps: true })
export class ModelConfig {
  @Prop({ required: true, index: true })
  applicationId: string;

  @Prop({ required: true, index: true })
  ownerId: string;

  @Prop({
    required: true,
    enum: ["openai", "anthropic", "google", "huggingface", "custom"],
  })
  provider: string;

  @Prop({ required: true })
  modelId: string;

  @Prop()
  displayName: string;

  @Prop({ type: Object, default: {} })
  settings: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
    systemPrompt?: string;
  };

  @Prop({ type: Object, default: {} })
  rateLimits: {
    requestsPerMinute?: number;
    tokensPerMinute?: number;
    maxConcurrent?: number;
  };

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object })
  credentials: {
    apiKey?: string;
    endpoint?: string;
    region?: string;
  };

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const ModelConfigSchema = SchemaFactory.createForClass(ModelConfig);

ModelConfigSchema.index({ applicationId: 1, provider: 1 });
ModelConfigSchema.index({ applicationId: 1, isDefault: 1 });
