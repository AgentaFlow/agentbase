import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsObject,
  Min,
  Max,
  IsIn,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

const VALID_PROVIDERS = ["openai", "anthropic", "gemini"];

const VALID_MODELS: Record<string, string[]> = {
  openai: ["gpt-4", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
  anthropic: [
    "claude-sonnet-4-5-20250929",
    "claude-haiku-4-5-20251001",
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
  ],
  gemini: [
    "gemini-2.0-flash",
    "gemini-2.5-flash-preview-05-20",
    "gemini-2.5-pro-preview-05-06",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
  ],
};

export class ApplicationConfigDto {
  @ApiPropertyOptional({ example: "openai", enum: VALID_PROVIDERS })
  @IsOptional()
  @IsString()
  @IsIn(VALID_PROVIDERS, {
    message: `aiProvider must be one of: ${VALID_PROVIDERS.join(", ")}`,
  })
  aiProvider?: string;

  @ApiPropertyOptional({ example: "gpt-4" })
  @IsOptional()
  @IsString()
  aiModel?: string;

  @ApiPropertyOptional({ example: "You are a helpful assistant." })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiPropertyOptional({ example: 0.7, minimum: 0, maximum: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ example: 2048, minimum: 1, maximum: 128000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(128000)
  maxTokens?: number;

  @ApiPropertyOptional({ example: ["plugin-id-1", "plugin-id-2"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledPlugins?: string[];

  @ApiPropertyOptional({ example: "theme-uuid" })
  @IsOptional()
  @IsString()
  themeId?: string;

  @ApiPropertyOptional({ example: { key: "value" } })
  @IsOptional()
  @IsObject()
  customSettings?: Record<string, any>;

  @ApiPropertyOptional({
    description: "Deployment configuration",
    example: { environment: "production", region: "us-east-1" },
  })
  @IsOptional()
  @IsObject()
  deploymentSettings?: Record<string, any>;

  /** Validate that aiModel belongs to the selected aiProvider. */
  static getValidModels(): Record<string, string[]> {
    return VALID_MODELS;
  }
}
