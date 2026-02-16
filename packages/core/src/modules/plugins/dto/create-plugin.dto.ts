import {
  IsString,
  IsOptional,
  MaxLength,
  IsObject,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePluginDto {
  @ApiProperty({ example: 'AI Chat Widget' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'ai-chat-widget' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiProperty({ example: '1.0.0' })
  @IsString()
  version: string;

  @ApiPropertyOptional({ example: 'An embeddable AI chat widget for your website' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 'AgentaFlow' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  manifest?: Record<string, any>;
}
