import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ collection: 'notifications', timestamps: true })
export class Notification {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: ['info', 'success', 'warning', 'error'] })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  message: string;

  @Prop()
  actionUrl: string;

  @Prop()
  actionLabel: string;

  @Prop({ default: false, index: true })
  read: boolean;

  @Prop()
  category: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
