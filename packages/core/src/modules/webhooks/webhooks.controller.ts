import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService, WEBHOOK_EVENTS } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('webhooks')
@Controller('webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('events')
  @ApiOperation({ summary: 'List available webhook events' })
  getEvents() {
    return WEBHOOK_EVENTS;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new webhook' })
  async create(@Request() req: any, @Body() dto: CreateWebhookDto) {
    const webhook = await this.webhooksService.create(req.user.sub, dto);
    return {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      secret: webhook.secret, // Only shown on creation!
      events: webhook.events,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List webhooks for current user' })
  async findAll(@Request() req: any) {
    const hooks = await this.webhooksService.findByOwner(req.user.sub);
    return hooks.map(h => ({
      id: h.id,
      name: h.name,
      url: h.url,
      events: h.events,
      isActive: h.isActive,
      lastTriggeredAt: h.lastTriggeredAt,
      totalDeliveries: h.totalDeliveries,
      failedDeliveries: h.failedDeliveries,
      lastError: h.lastError,
      createdAt: h.createdAt,
    }));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a webhook' })
  async update(@Param('id') id: string, @Request() req: any, @Body() body: Partial<CreateWebhookDto>) {
    return this.webhooksService.update(id, req.user.sub, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webhook' })
  async delete(@Param('id') id: string, @Request() req: any) {
    await this.webhooksService.delete(id, req.user.sub);
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Toggle webhook active/inactive' })
  async toggle(@Param('id') id: string, @Request() req: any) {
    return this.webhooksService.toggleActive(id, req.user.sub);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Send a test ping to the webhook' })
  async test(@Param('id') id: string, @Request() req: any) {
    return this.webhooksService.test(id, req.user.sub);
  }
}
