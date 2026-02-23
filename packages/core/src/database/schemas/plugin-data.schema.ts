import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type PluginDataDocument = PluginData & Document;

/**
 * Scoped key-value storage for plugins.
 * Each plugin gets its own namespace identified by pluginId + applicationId.
 */
@Schema({ collection: "plugin_data", timestamps: true })
export class PluginData {
  @Prop({ required: true, index: true })
  pluginId: string;

  @Prop({ required: true, index: true })
  applicationId: string;

  @Prop({ required: true })
  key: string;

  @Prop({ type: Object })
  value: any;
}

export const PluginDataSchema = SchemaFactory.createForClass(PluginData);

PluginDataSchema.index(
  { pluginId: 1, applicationId: 1, key: 1 },
  { unique: true },
);
PluginDataSchema.index({ pluginId: 1, applicationId: 1 });
