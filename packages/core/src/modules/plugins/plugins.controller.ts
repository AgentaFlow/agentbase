import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PluginsService } from './plugins.service';
import { CreatePluginDto } from './dto/create-plugin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PluginStatus } from '../../database/entities';

@ApiTags('plugins')
@Controller('plugins')
export class PluginsController {
  constructor(private readonly pluginsService: PluginsService) {}

  @Get()
  @ApiOperation({ summary: 'List all plugins' })
  @ApiQuery({ name: 'status', enum: PluginStatus, required: false })
  async findAll(@Query('status') status?: PluginStatus) {
    return this.pluginsService.findAll(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plugin by ID' })
  async findOne(@Param('id') id: string) {
    return this.pluginsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new plugin' })
  async create(@Body() dto: CreatePluginDto) {
    return this.pluginsService.create(dto);
  }

  @Put(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a plugin' })
  async publish(@Param('id') id: string) {
    return this.pluginsService.publish(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a plugin' })
  async delete(@Param('id') id: string) {
    await this.pluginsService.delete(id);
  }
}
