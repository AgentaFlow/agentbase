import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get(':applicationId')
  @ApiOperation({ summary: 'Get application analytics' })
  async getStats(
    @Param('applicationId') applicationId: string,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getAppStats(applicationId, parseInt(days || '30'));
  }

  @Get(':applicationId/events')
  @ApiOperation({ summary: 'Get recent analytics events' })
  async getEvents(
    @Param('applicationId') applicationId: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getRecentEvents(applicationId, parseInt(limit || '50'));
  }
}
