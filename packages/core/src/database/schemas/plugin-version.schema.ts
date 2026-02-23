import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type PluginVersionDocument = PluginVersion & Document;

@Schema({ collection: "plugin_versions", timestamps: true })
export class PluginVersion {
  @Prop({ required: true, index: true })
  pluginId: string;

  @Prop({ required: true })
  version: string;

  @Prop()
  changelog: string;

  @Prop({ type: Object, default: {} })
  compatibility: {
    minPlatformVersion?: string;
    maxPlatformVersion?: string;
  };

  @Prop()
  downloadUrl: string;

  @Prop()
  fileSize: number;

  @Prop()
  checksum: string;

  @Prop({ required: true })
  publishedBy: string;

  @Prop({ type: Date, default: Date.now })
  releasedAt: Date;
}

export const PluginVersionSchema = SchemaFactory.createForClass(PluginVersion);

PluginVersionSchema.index({ pluginId: 1, version: 1 }, { unique: true });
PluginVersionSchema.index({ pluginId: 1, releasedAt: -1 });
