import { IsOptional, IsString, IsBoolean, MaxLength, Matches, IsObject } from 'class-validator';

export class UpdateBrandingDto {
  @IsOptional() @IsString() @MaxLength(100) companyName?: string;
  @IsOptional() @IsString() @MaxLength(255) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(255) faviconUrl?: string;

  @IsOptional() @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/) primaryColor?: string;
  @IsOptional() @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/) secondaryColor?: string;
  @IsOptional() @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/) accentColor?: string;
  @IsOptional() @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/) backgroundColor?: string;
  @IsOptional() @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/) textColor?: string;

  @IsOptional() @IsString() @MaxLength(100) fontFamily?: string;
  @IsOptional() @IsString() @MaxLength(100) headingFont?: string;

  @IsOptional() @IsObject() widgetConfig?: Record<string, any>;
  @IsOptional() @IsObject() emailConfig?: Record<string, any>;

  @IsOptional() @IsString() @MaxLength(5000) customCss?: string;
  @IsOptional() @IsBoolean() showPoweredBy?: boolean;
}
