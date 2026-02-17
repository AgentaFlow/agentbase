import {
  Controller, Get, Put, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersService } from '../users/users.service';
import { ApplicationsService } from '../applications/applications.service';
import { PluginsService } from '../plugins/plugins.service';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly applicationsService: ApplicationsService,
    private readonly pluginsService: PluginsService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform-wide statistics' })
  async platformStats() {
    const [users, apps, plugins] = await Promise.all([
      this.usersService.findAll(),
      this.applicationsService.findAll(),
      this.pluginsService.findAll(),
    ]);
    return {
      totalUsers: users.length,
      totalApplications: apps.length,
      totalPlugins: plugins.length,
      activeApplications: apps.filter((a: any) => a.status === 'active').length,
    };
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  async listUsers(@Query('page') page?: string, @Query('limit') limit?: string) {
    const users = await this.usersService.findAll();
    return { users, total: users.length };
  }

  @Put('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  async updateUserRole(@Param('id') id: string, @Body() body: { role: string }) {
    return this.usersService.update(id, { role: body.role as any });
  }

  @Put('users/:id/status')
  @ApiOperation({ summary: 'Activate/deactivate user' })
  async updateUserStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.usersService.update(id, { isActive: body.isActive });
  }

  @Get('applications')
  @ApiOperation({ summary: 'List all applications across all users' })
  async listApplications() {
    return this.applicationsService.findAll();
  }

  @Get('plugins')
  @ApiOperation({ summary: 'List all plugins' })
  async listPlugins() {
    return this.pluginsService.findAll();
  }
}
