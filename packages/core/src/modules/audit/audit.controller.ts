import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Query audit logs' })
  async query(
    @Request() req: any,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    // Non-admin users can only see their own logs
    const userId = req.user.role === 'admin' ? undefined : req.user.sub;
    return this.auditService.query({
      userId,
      action,
      resource,
      limit: parseInt(limit || '50'),
      skip: parseInt(skip || '0'),
    });
  }

  @Get('my-activity')
  @ApiOperation({ summary: 'Get your recent activity summary' })
  async myActivity(@Request() req: any, @Query('days') days?: string) {
    return this.auditService.getUserActivity(req.user.sub, parseInt(days || '30'));
  }

  @Get('security')
  @ApiOperation({ summary: 'Get security events (admin only)' })
  async security(@Request() req: any, @Query('limit') limit?: string) {
    return this.auditService.getSecurityEvents(parseInt(limit || '100'));
  }
}
