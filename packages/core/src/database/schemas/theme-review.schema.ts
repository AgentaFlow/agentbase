import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ThemeReviewDocument = ThemeReview & Document;

@Schema({ collection: "theme_reviews", timestamps: true })
export class ThemeReview {
  @Prop({ required: true, index: true })
  themeId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ maxlength: 2000 })
  review: string;

  @Prop({ default: "1.0.0" })
  themeVersion: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const ThemeReviewSchema = SchemaFactory.createForClass(ThemeReview);

ThemeReviewSchema.index({ themeId: 1, userId: 1 }, { unique: true });
ThemeReviewSchema.index({ themeId: 1, createdAt: -1 });
