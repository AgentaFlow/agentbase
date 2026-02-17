import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ collection: 'audit_logs', timestamps: true })
export class AuditLog {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop()
  userEmail: string;

  @Prop({ required: true, index: true })
  action: string;

  @Prop({ index: true })
  resource: string;

  @Prop()
  resourceId: string;

  @Prop({ type: Object })
  details: Record<string, any>;

  @Prop()
  ipAddress: string;

  @Prop()
  userAgent: string;

  @Prop({ enum: ['success', 'failure', 'warning'], default: 'success' })
  outcome: string;

  @Prop({ type: Date, default: Date.now, index: true })
  timestamp: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1 });
