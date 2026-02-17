import { IsString, IsOptional, MaxLength, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateKnowledgeBaseDto {
  @ApiProperty({ example: 'Product Documentation' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 'app-uuid' })
  @IsString()
  applicationId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: {
    chunkSize?: number;
    chunkOverlap?: number;
    embeddingModel?: string;
    retrievalTopK?: number;
    similarityThreshold?: number;
  };
}
