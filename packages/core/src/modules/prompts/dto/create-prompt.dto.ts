import { IsString, IsOptional, IsArray, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePromptDto {
  @ApiProperty({ example: 'app-uuid-here' })
  @IsString()
  applicationId: string;

  @ApiProperty({ example: 'Customer Support Bot' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    example:
      'You are a helpful customer support agent for {{company_name}}. Answer questions about {{product}}.',
  })
  @IsString()
  template: string;

  @ApiPropertyOptional({ example: ['company_name', 'product'] })
  @IsOptional()
  @IsArray()
  variables?: string[];

  @ApiPropertyOptional({ example: 'Template for customer support interactions' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
