import { IsString, IsOptional, MaxLength, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkflowDto {
  @ApiProperty({ example: 'Customer Onboarding Flow' })
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
  @IsArray()
  nodes?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  edges?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
}
