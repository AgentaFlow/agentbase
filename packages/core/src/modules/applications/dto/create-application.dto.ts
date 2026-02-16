import {
  IsString,
  IsOptional,
  MaxLength,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApplicationDto {
  @ApiProperty({ example: 'My AI Chatbot' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'A customer support chatbot powered by AI' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    example: {
      aiProvider: 'openai',
      aiModel: 'gpt-4',
      temperature: 0.7,
    },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
