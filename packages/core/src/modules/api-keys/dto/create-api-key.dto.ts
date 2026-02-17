import { IsString, IsOptional, IsArray, IsInt, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Production Key' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'app-uuid' })
  @IsOptional()
  @IsString()
  applicationId?: string;

  @ApiPropertyOptional({ example: ['chat', 'conversations'] })
  @IsOptional()
  @IsArray()
  scopes?: string[];

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  rateLimit?: number;
}
