import { PartialType } from '@nestjs/swagger';
import { CreateApplicationDto } from './create-application.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppStatus } from '../../../database/entities';

export class UpdateApplicationDto extends PartialType(CreateApplicationDto) {
  @ApiPropertyOptional({ enum: AppStatus })
  @IsOptional()
  @IsEnum(AppStatus)
  status?: AppStatus;
}
