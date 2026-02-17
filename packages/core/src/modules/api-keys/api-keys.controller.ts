import {
  Controller, Get, Post, Delete, Param, Body, UseGuards, Request,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('api-keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key (raw key returned only once)' })
  async create(@Request() req: any, @Body() dto: CreateApiKeyDto) {
    const { apiKey, rawKey } = await this.apiKeysService.create(req.user.sub, dto);
    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      rawKey, // Only returned on creation!
      scopes: apiKey.scopes,
      rateLimit: apiKey.rateLimit,
      createdAt: apiKey.createdAt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys for current user' })
  async findAll(@Request() req: any) {
    const keys = await this.apiKeysService.findByOwner(req.user.sub);
    return keys.map(k => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      scopes: k.scopes,
      rateLimit: k.rateLimit,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
      totalRequests: k.totalRequests,
      createdAt: k.createdAt,
    }));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke and delete an API key' })
  async delete(@Param('id') id: string, @Request() req: any) {
    await this.apiKeysService.delete(id, req.user.sub);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an API key (disable without deleting)' })
  async revoke(@Param('id') id: string, @Request() req: any) {
    await this.apiKeysService.revoke(id, req.user.sub);
    return { message: 'API key revoked' };
  }
}
