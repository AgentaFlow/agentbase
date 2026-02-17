import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AnalyticsEventDocument = AnalyticsEvent & Document;

@Schema({ collection: 'analytics_events', timestamps: true })
export class AnalyticsEvent {
  @Prop({ required: true, index: true })
  applicationId: string;

  @Prop({ required: true })
  eventType: string; // 'message_sent' | 'message_received' | 'conversation_started' | 'conversation_ended' | 'api_call' | 'widget_loaded' | 'error'

  @Prop({ index: true })
  userId: string;

  @Prop()
  conversationId: string;

  @Prop({ type: Object, default: {} })
  data: {
    provider?: string;
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    latencyMs?: number;
    source?: string; // 'dashboard' | 'widget' | 'api'
    error?: string;
    userAgent?: string;
    referrer?: string;
  };

  @Prop({ type: Date, default: Date.now, index: true })
  timestamp: Date;
}

export const AnalyticsEventSchema = SchemaFactory.createForClass(AnalyticsEvent);

AnalyticsEventSchema.index({ applicationId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ applicationId: 1, eventType: 1, timestamp: -1 });
