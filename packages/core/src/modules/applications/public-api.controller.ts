import {
  Controller, Get, Post, Param, Body, UseGuards, UseInterceptors,
  Request, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { RateLimitInterceptor } from '../../common/interceptors/rate-limit.interceptor';
import { ApplicationsService } from './applications.service';
import { AnalyticsService } from '../analytics/analytics.service';

@ApiTags('public-api')
@Controller('v1')
@UseGuards(ApiKeyGuard)
@UseInterceptors(RateLimitInterceptor)
export class PublicApiController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('app')
  @ApiOperation({ summary: 'Get application config (public API)' })
  async getApp(@Request() req: any) {
    const app = req.apiKeyApp;
    if (!app) throw new NotFoundException('No application linked to this API key');

    return {
      id: app.id,
      name: app.name,
      description: app.description,
      config: {
        aiProvider: app.config?.aiProvider,
        aiModel: app.config?.aiModel,
        temperature: app.config?.temperature,
        systemPrompt: app.config?.systemPrompt,
      },
    };
  }

  @Get('app/:slug')
  @ApiOperation({ summary: 'Get application by slug' })
  async getBySlug(@Param('slug') slug: string) {
    const app = await this.applicationsService.findBySlug(slug);
    if (!app || app.status !== 'active') {
      throw new NotFoundException('Application not found');
    }
    return {
      id: app.id,
      name: app.name,
      description: app.description,
      slug: app.slug,
    };
  }

  @Post('chat')
  @ApiOperation({ summary: 'Send a chat message via public API' })
  async chat(@Request() req: any, @Body() body: {
    message: string;
    conversationId?: string;
    sessionId?: string;
  }) {
    const app = req.apiKeyApp;
    if (!app) throw new BadRequestException('API key must be scoped to an application');

    await this.analyticsService.track({
      applicationId: app.id,
      eventType: 'message_sent',
      data: { source: 'api' },
    });

    // Forward to AI service (proxy pattern)
    const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

    let conversationId = body.conversationId;
    if (!conversationId) {
      const convRes = await fetch(`${AI_URL}/api/ai/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: app.id,
          user_id: body.sessionId || 'anonymous',
          title: body.message.slice(0, 50),
        }),
      });
      const conv = await convRes.json();
      conversationId = conv.id;
    }

    const msgRes = await fetch(`${AI_URL}/api/ai/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: body.message,
        provider: app.config?.aiProvider,
        model: app.config?.aiModel,
        temperature: app.config?.temperature ?? 0.7,
        system_prompt: app.config?.systemPrompt,
      }),
    });
    const result = await msgRes.json();

    await this.analyticsService.track({
      applicationId: app.id,
      eventType: 'message_received',
      conversationId,
      data: {
        source: 'api',
        provider: app.config?.aiProvider,
        model: app.config?.aiModel,
        totalTokens: result.usage?.total_tokens,
      },
    });

    return {
      conversationId,
      response: result.response,
      usage: result.usage,
    };
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get conversation history' })
  async getConversation(@Param('conversationId') id: string) {
    const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const res = await fetch(`${AI_URL}/api/ai/conversations/${id}`);
    if (!res.ok) throw new NotFoundException('Conversation not found');
    return res.json();
  }
}
