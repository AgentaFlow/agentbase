import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PluginReviewDocument = PluginReview & Document;

@Schema({ collection: 'plugin_reviews', timestamps: true })
export class PluginReview {
  @Prop({ required: true, index: true })
  pluginId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ maxlength: 2000 })
  review: string;

  @Prop({ default: '1.0.0' })
  pluginVersion: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const PluginReviewSchema = SchemaFactory.createForClass(PluginReview);

PluginReviewSchema.index({ pluginId: 1, userId: 1 }, { unique: true });
PluginReviewSchema.index({ pluginId: 1, createdAt: -1 });
