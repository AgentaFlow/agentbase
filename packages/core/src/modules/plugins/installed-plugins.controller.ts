import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InstalledPluginsService } from './installed-plugins.service';

class InstallPluginDto {
  @ApiProperty({ description: 'Plugin ID to install' })
  @IsString()
  pluginId: string;
}

class UpdatePluginSettingsDto {
  @ApiProperty()
  @IsObject()
  settings: Record<string, any>;
}

@ApiTags('installed-plugins')
@Controller('applications/:appId/plugins')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InstalledPluginsController {
  constructor(private readonly service: InstalledPluginsService) {}

  @Get()
  @ApiOperation({ summary: 'List installed plugins for an application' })
  async list(@Param('appId') appId: string, @Request() req: any) {
    return this.service.getInstalledPlugins(appId, req.user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Install a plugin on an application' })
  async install(
    @Param('appId') appId: string,
    @Body() dto: InstallPluginDto,
    @Request() req: any,
  ) {
    return this.service.install(appId, dto.pluginId, req.user.sub);
  }

  @Put(':pluginId/activate')
  @ApiOperation({ summary: 'Activate an installed plugin' })
  async activate(
    @Param('appId') appId: string,
    @Param('pluginId') pluginId: string,
    @Request() req: any,
  ) {
    return this.service.activate(appId, pluginId, req.user.sub);
  }

  @Put(':pluginId/deactivate')
  @ApiOperation({ summary: 'Deactivate an installed plugin' })
  async deactivate(
    @Param('appId') appId: string,
    @Param('pluginId') pluginId: string,
    @Request() req: any,
  ) {
    return this.service.deactivate(appId, pluginId, req.user.sub);
  }

  @Put(':pluginId/settings')
  @ApiOperation({ summary: 'Update plugin settings' })
  async updateSettings(
    @Param('appId') appId: string,
    @Param('pluginId') pluginId: string,
    @Body() dto: UpdatePluginSettingsDto,
    @Request() req: any,
  ) {
    return this.service.updateSettings(appId, pluginId, req.user.sub, dto.settings);
  }

  @Delete(':pluginId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Uninstall a plugin from an application' })
  async uninstall(
    @Param('appId') appId: string,
    @Param('pluginId') pluginId: string,
    @Request() req: any,
  ) {
    await this.service.uninstall(appId, pluginId, req.user.sub);
  }
}
