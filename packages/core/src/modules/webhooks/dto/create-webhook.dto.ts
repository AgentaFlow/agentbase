import { IsString, IsOptional, IsArray, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebhookDto {
  @ApiProperty({ example: 'My Slack Integration' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'https://hooks.slack.com/services/...' })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({ example: ['message.sent', 'conversation.started'] })
  @IsOptional()
  @IsArray()
  events?: string[];

  @ApiPropertyOptional({ example: 'app-uuid' })
  @IsOptional()
  @IsString()
  applicationId?: string;
}
