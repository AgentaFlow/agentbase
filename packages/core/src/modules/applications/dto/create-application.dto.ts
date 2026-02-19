import {
  IsString,
  IsOptional,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ApplicationConfigDto } from "./application-config.dto";

export class CreateApplicationDto {
  @ApiProperty({ example: "My AI Chatbot" })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: "A customer support chatbot powered by AI" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ type: ApplicationConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ApplicationConfigDto)
  config?: ApplicationConfigDto;
}
