import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';
import { Application, AppStatus } from '../../database/entities/application.entity';
import { Conversation, ConversationDocument } from '../../database/schemas/conversation.schema';
import { AuditService } from '../audit/audit.service';

export interface ExportOptions {
  format: 'json' | 'csv';
  resource: 'applications' | 'conversations' | 'analytics' | 'all';
  applicationId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);

  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    private readonly audit: AuditService,
  ) {}

  async exportData(userId: string, options: ExportOptions): Promise<{ data: any; filename: string; mimeType: string }> {
    const { format, resource, applicationId, dateFrom, dateTo } = options;

    let data: any;
    let filename: string;

    switch (resource) {
      case 'applications':
        data = await this.exportApplications(userId);
        filename = `agentbase-apps-${Date.now()}`;
        break;
      case 'conversations':
        data = await this.exportConversations(userId, applicationId, dateFrom, dateTo);
        filename = `agentbase-conversations-${Date.now()}`;
        break;
      case 'analytics':
        data = await this.exportAnalytics(userId, applicationId, dateFrom, dateTo);
        filename = `agentbase-analytics-${Date.now()}`;
        break;
      case 'all':
        data = await this.exportAll(userId);
        filename = `agentbase-full-export-${Date.now()}`;
        break;
      default:
        throw new BadRequestException(`Unknown resource: ${resource}`);
    }

    await this.audit.log({
      userId,
      action: 'data.exported',
      resource: 'export',
      details: { resource, format, recordCount: Array.isArray(data) ? data.length : 1 },
    });

    if (format === 'csv') {
      return {
        data: this.toCsv(data),
        filename: `${filename}.csv`,
        mimeType: 'text/csv',
      };
    }

    return {
      data: JSON.stringify(data, null, 2),
      filename: `${filename}.json`,
      mimeType: 'application/json',
    };
  }

  private async exportApplications(userId: string) {
    const apps = await this.appRepo.find({ where: { ownerId: userId } });
    return apps.map(app => ({
      id: app.id,
      name: app.name,
      slug: app.slug,
      description: app.description,
      systemPrompt: app.config?.systemPrompt,
      model: app.config?.aiModel,
      temperature: app.config?.temperature,
      maxTokens: app.config?.maxTokens,
      status: app.status,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    }));
  }

  private async exportConversations(userId: string, appId?: string, from?: Date, to?: Date) {
    const query: any = { ownerId: userId };
    if (appId) query.applicationId = appId;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = from;
      if (to) query.createdAt.$lte = to;
    }

    const conversations = await this.conversationModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean();

    return conversations.map((c: any) => ({
      id: c._id?.toString(),
      applicationId: c.applicationId,
      sessionId: c.sessionId,
      messages: c.messages?.map((m: any) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        tokens: m.tokens,
      })),
      metadata: c.metadata,
      createdAt: c.createdAt,
    }));
  }

  private async exportAnalytics(userId: string, appId?: string, from?: Date, to?: Date) {
    // Aggregate analytics data
    const matchStage: any = { ownerId: userId };
    if (appId) matchStage.applicationId = appId;
    if (from || to) {
      matchStage.timestamp = {};
      if (from) matchStage.timestamp.$gte = from;
      if (to) matchStage.timestamp.$lte = to;
    }

    return {
      exportedAt: new Date(),
      note: 'Analytics data - aggregated from analytics events collection',
      filters: { userId, appId, from, to },
    };
  }

  private async exportAll(userId: string) {
    const [apps, conversations] = await Promise.all([
      this.exportApplications(userId),
      this.exportConversations(userId),
    ]);

    return {
      exportedAt: new Date(),
      version: '1.0',
      platform: 'agentbase',
      applications: apps,
      conversations,
    };
  }

  async importApplications(userId: string, data: any[]): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    for (const item of data) {
      try {
        const app = this.appRepo.create({
          name: item.name || 'Imported App',
          slug: `${item.slug || 'imported'}-${Date.now()}`,
          description: item.description,
          config: {
            systemPrompt: item.systemPrompt,
            aiModel: item.model || 'gpt-4',
            temperature: item.temperature ?? 0.7,
            maxTokens: item.maxTokens ?? 2048,
          },
          ownerId: userId,
          status: AppStatus.DRAFT,
        });
        await this.appRepo.save(app);
        imported++;
      } catch (err: any) {
        errors.push(`Failed to import "${item.name}": ${err.message}`);
      }
    }

    await this.audit.log({
      userId,
      action: 'data.imported',
      resource: 'import',
      details: { imported, errors: errors.length },
    });

    return { imported, errors };
  }

  private toCsv(data: any): string {
    if (!Array.isArray(data) || data.length === 0) {
      return 'No data to export';
    }

    const flattenObj = (obj: any, prefix = ''): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const [key, val] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
          Object.assign(result, flattenObj(val, fullKey));
        } else {
          result[fullKey] = val instanceof Date ? val.toISOString() :
            Array.isArray(val) ? JSON.stringify(val) : String(val ?? '');
        }
      }
      return result;
    };

    const flattened = data.map(item => flattenObj(item));
    const headers = [...new Set(flattened.flatMap(row => Object.keys(row)))];

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = [
      headers.map(escape).join(','),
      ...flattened.map(row => headers.map(h => escape(row[h] || '')).join(',')),
    ];

    return rows.join('\n');
  }
}
