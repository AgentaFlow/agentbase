import {
  Controller, Get, Post, Delete, Param, Query, Body, Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('conversations')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get('app/:appId')
  @ApiOperation({ summary: 'List conversations for an application' })
  async findByApp(
    @Param('appId') appId: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.conversationsService.findByApp(appId, {
      search,
      limit: parseInt(limit || '20'),
      skip: parseInt(skip || '0'),
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('app/:appId/stats')
  @ApiOperation({ summary: 'Get conversation statistics for an application' })
  async getStats(@Param('appId') appId: string) {
    return this.conversationsService.getStats(appId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full conversation with messages' })
  async findOne(@Param('id') id: string) {
    return this.conversationsService.findById(id);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export a single conversation' })
  async exportOne(
    @Param('id') id: string,
    @Query('format') format?: string,
    @Res() res?: Response,
  ) {
    const result = await this.conversationsService.exportConversation(
      id,
      (format as any) || 'json',
    );
    res!.setHeader('Content-Type', result.mimeType);
    res!.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res!.send(result.data);
  }

  @Post('app/:appId/export')
  @ApiOperation({ summary: 'Bulk export conversations' })
  async bulkExport(
    @Param('appId') appId: string,
    @Body() body: { format?: string; from?: string; to?: string },
    @Res() res?: Response,
  ) {
    const result = await this.conversationsService.bulkExport(
      appId,
      (body.format as any) || 'json',
      body.from ? new Date(body.from) : undefined,
      body.to ? new Date(body.to) : undefined,
    );
    res!.setHeader('Content-Type', result.mimeType);
    res!.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res!.send(result.data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a conversation' })
  async delete(@Param('id') id: string) {
    await this.conversationsService.delete(id);
    return { deleted: true };
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Bulk delete conversations' })
  async bulkDelete(@Body() body: { ids: string[] }) {
    return this.conversationsService.bulkDelete(body.ids);
  }
}
