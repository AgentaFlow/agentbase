import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({ example: 'My AI Team' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'my-ai-team' })
  @IsString()
  @MaxLength(60)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens' })
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class InviteMemberDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  email: string;

  @ApiPropertyOptional({ example: 'member', enum: ['admin', 'member', 'viewer'] })
  @IsOptional()
  @IsString()
  role?: string;
}
