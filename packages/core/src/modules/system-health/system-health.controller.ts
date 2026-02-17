import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemHealthService } from './system-health.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('system-health')
@Controller('system')
export class SystemHealthController {
  constructor(private readonly healthService: SystemHealthService) {}

  @Get('health')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Full system health check (admin)' })
  health() {
    return this.healthService.getFullHealthCheck();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Platform statistics (admin)' })
  stats() {
    return this.healthService.getPlatformStats();
  }
}
