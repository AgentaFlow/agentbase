import { ApiProperty } from "@nestjs/swagger";
import { AiProvider } from "../../../database/entities";

export class ProviderKeyResponseDto {
  @ApiProperty({ enum: AiProvider })
  provider: AiProvider;

  /** Last 4 chars of the raw key, prefixed with bullets for display. */
  @ApiProperty({ example: "····a1b2" })
  keyHint: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ nullable: true })
  lastUsedAt: Date | null;

  @ApiProperty({ nullable: true })
  lastValidatedAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}
