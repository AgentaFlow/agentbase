import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation } from '../../database/schemas/conversation.schema';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @InjectModel('Conversation')
    private readonly conversationModel: Model<any>,
  ) {}

  async findByApp(applicationId: string, params?: {
    search?: string;
    limit?: number;
    skip?: number;
    from?: Date;
    to?: Date;
  }) {
    const query: any = { applicationId };

    if (params?.search) {
      query.$or = [
        { 'messages.content': { $regex: params.search, $options: 'i' } },
        { metadata: { $regex: params.search, $options: 'i' } },
      ];
    }
    if (params?.from || params?.to) {
      query.createdAt = {};
      if (params?.from) query.createdAt.$gte = params.from;
      if (params?.to) query.createdAt.$lte = params.to;
    }

    const limit = params?.limit || 20;
    const skip = params?.skip || 0;

    const [conversations, total] = await Promise.all([
      this.conversationModel.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).exec(),
      this.conversationModel.countDocuments(query),
    ]);

    return {
      conversations: conversations.map(c => ({
        id: c._id,
        applicationId: c.applicationId,
        sessionId: c.sessionId,
        messageCount: c.messages?.length || 0,
        lastMessage: c.messages?.[c.messages.length - 1]?.content?.slice(0, 100),
        metadata: c.metadata,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      total,
      limit,
      skip,
    };
  }

  async findById(id: string) {
    const conv = await this.conversationModel.findById(id);
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  async delete(id: string) {
    const result = await this.conversationModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Conversation not found');
    this.logger.log(`Conversation ${id} deleted`);
  }

  async bulkDelete(ids: string[]) {
    const result = await this.conversationModel.deleteMany({ _id: { $in: ids } });
    this.logger.log(`Bulk deleted ${result.deletedCount} conversations`);
    return { deleted: result.deletedCount };
  }

  async exportConversation(id: string, format: 'json' | 'csv' | 'txt' = 'json') {
    const conv = await this.findById(id);

    switch (format) {
      case 'csv': {
        const header = 'timestamp,role,content\n';
        const rows = (conv.messages || []).map((m: any) =>
          `"${m.timestamp || ''}","${m.role}","${(m.content || '').replace(/"/g, '""')}"`
        ).join('\n');
        return { data: header + rows, filename: `conversation-${id}.csv`, mimeType: 'text/csv' };
      }
      case 'txt': {
        const lines = (conv.messages || []).map((m: any) =>
          `[${m.role.toUpperCase()}]: ${m.content}`
        ).join('\n\n');
        return { data: lines, filename: `conversation-${id}.txt`, mimeType: 'text/plain' };
      }
      default:
        return {
          data: JSON.stringify({
            id: conv._id,
            applicationId: conv.applicationId,
            sessionId: conv.sessionId,
            messages: conv.messages,
            metadata: conv.metadata,
            createdAt: conv.createdAt,
          }, null, 2),
          filename: `conversation-${id}.json`,
          mimeType: 'application/json',
        };
    }
  }

  async bulkExport(applicationId: string, format: 'json' | 'csv' = 'json', from?: Date, to?: Date) {
    const query: any = { applicationId };
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = from;
      if (to) query.createdAt.$lte = to;
    }

    const conversations = await this.conversationModel.find(query).sort({ createdAt: -1 }).limit(500).exec();

    if (format === 'csv') {
      const header = 'conversation_id,timestamp,role,content\n';
      const rows = conversations.flatMap((c: any) =>
        (c.messages || []).map((m: any) =>
          `"${c._id}","${m.timestamp || ''}","${m.role}","${(m.content || '').replace(/"/g, '""')}"`
        )
      ).join('\n');
      return { data: header + rows, filename: `conversations-export.csv`, mimeType: 'text/csv' };
    }

    return {
      data: JSON.stringify(conversations.map((c: any) => ({
        id: c._id,
        sessionId: c.sessionId,
        messages: c.messages,
        metadata: c.metadata,
        createdAt: c.createdAt,
      })), null, 2),
      filename: `conversations-export.json`,
      mimeType: 'application/json',
    };
  }

  async getStats(applicationId: string) {
    const [total, recent, avgMessages] = await Promise.all([
      this.conversationModel.countDocuments({ applicationId }),
      this.conversationModel.countDocuments({
        applicationId,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      this.conversationModel.aggregate([
        { $match: { applicationId } },
        { $project: { messageCount: { $size: { $ifNull: ['$messages', []] } } } },
        { $group: { _id: null, avg: { $avg: '$messageCount' }, total: { $sum: '$messageCount' } } },
      ]),
    ]);

    return {
      totalConversations: total,
      last7Days: recent,
      avgMessagesPerConversation: avgMessages[0]?.avg?.toFixed(1) || '0',
      totalMessages: avgMessages[0]?.total || 0,
    };
  }
}
