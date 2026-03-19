import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Param,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ProviderKeysService } from "./provider-keys.service";
import { SaveProviderKeyDto } from "./dto/save-provider-key.dto";
import { ProviderKeyResponseDto } from "./dto/provider-key-response.dto";
import { AiProvider } from "../../database/entities";

@ApiTags("provider-keys")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("provider-keys")
export class ProviderKeysController {
  constructor(private readonly service: ProviderKeysService) {}

  @Get()
  @ApiOperation({
    summary: "List saved AI provider keys (hints only — no plaintext)",
  })
  @ApiResponse({ status: 200, type: [ProviderKeyResponseDto] })
  list(@Request() req: any): Promise<ProviderKeyResponseDto[]> {
    return this.service.list(req.user.sub);
  }

  @Put(":provider")
  @ApiOperation({
    summary: "Save or update an AI provider key (encrypted at rest)",
  })
  @ApiParam({ name: "provider", enum: AiProvider })
  @ApiResponse({ status: 200, type: ProviderKeyResponseDto })
  upsert(
    @Request() req: any,
    @Param("provider") provider: AiProvider,
    @Body() dto: SaveProviderKeyDto,
  ): Promise<ProviderKeyResponseDto> {
    dto.provider = provider; // ensure param takes precedence
    return this.service.upsert(req.user.sub, dto);
  }

  @Delete(":provider")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a saved AI provider key" })
  @ApiParam({ name: "provider", enum: AiProvider })
  @ApiResponse({ status: 204 })
  remove(
    @Request() req: any,
    @Param("provider") provider: AiProvider,
  ): Promise<void> {
    return this.service.remove(req.user.sub, provider);
  }

  @Post(":provider/validate")
  @ApiOperation({
    summary: "Validate a saved key against the live provider API",
  })
  @ApiParam({ name: "provider", enum: AiProvider })
  @ApiResponse({ status: 200, schema: { example: { valid: true } } })
  validate(
    @Request() req: any,
    @Param("provider") provider: AiProvider,
  ): Promise<{ valid: boolean; error?: string }> {
    return this.service.validate(req.user.sub, provider);
  }
}
