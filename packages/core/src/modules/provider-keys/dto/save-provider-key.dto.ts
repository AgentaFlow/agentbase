import { IsEnum, IsString, MinLength, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { AiProvider } from "../../../database/entities";

export class SaveProviderKeyDto {
  @ApiProperty({
    enum: AiProvider,
    description: "The AI provider this key belongs to",
    example: AiProvider.OPENAI,
  })
  @IsEnum(AiProvider)
  provider: AiProvider;

  @ApiProperty({
    description: "The raw API key. Stored encrypted; never returned.",
    example: "sk-...",
  })
  @IsString()
  @MinLength(10, { message: "API key appears too short" })
  @MaxLength(500, { message: "API key appears too long" })
  apiKey: string;
}
