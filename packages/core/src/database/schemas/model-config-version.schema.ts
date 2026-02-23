import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ModelConfigVersionDocument = ModelConfigVersion & Document;

/**
 * Tracks versions of a model configuration for A/B testing.
 * Each version captures a snapshot of settings at a point in time.
 */
@Schema({ collection: "model_config_versions", timestamps: true })
export class ModelConfigVersion {
  @Prop({ required: true, index: true })
  configId: string;

  @Prop({ required: true, index: true })
  applicationId: string;

  @Prop({ required: true })
  version: number;

  @Prop()
  label: string;

  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  modelId: string;

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

  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  trafficPercent: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object, default: {} })
  metrics: {
    requestCount?: number;
    avgLatencyMs?: number;
    avgTokensUsed?: number;
    errorRate?: number;
    userSatisfactionScore?: number;
  };

  @Prop()
  publishedBy: string;

  @Prop({ type: Date })
  publishedAt: Date;
}

export const ModelConfigVersionSchema =
  SchemaFactory.createForClass(ModelConfigVersion);

ModelConfigVersionSchema.index({ configId: 1, version: 1 }, { unique: true });
ModelConfigVersionSchema.index({ applicationId: 1, isActive: 1 });
