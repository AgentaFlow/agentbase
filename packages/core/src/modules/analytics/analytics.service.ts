import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AnalyticsEvent,
  AnalyticsEventDocument,
} from '../../database/schemas/analytics-event.schema';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(AnalyticsEvent.name)
    private readonly eventModel: Model<AnalyticsEventDocument>,
  ) {}

  async track(data: {
    applicationId: string;
    eventType: string;
    userId?: string;
    conversationId?: string;
    data?: Record<string, any>;
  }) {
    const event = new this.eventModel({
      ...data,
      timestamp: new Date(),
    });
    await event.save();
  }

  async getAppStats(applicationId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      totalConversations,
      totalMessages,
      totalTokens,
      dailyActivity,
      providerBreakdown,
      sourceBreakdown,
    ] = await Promise.all([
      this.eventModel.countDocuments({
        applicationId,
        eventType: 'conversation_started',
        timestamp: { $gte: since },
      }),
      this.eventModel.countDocuments({
        applicationId,
        eventType: { $in: ['message_sent', 'message_received'] },
        timestamp: { $gte: since },
      }),
      this.eventModel.aggregate([
        { $match: { applicationId, timestamp: { $gte: since }, 'data.totalTokens': { $exists: true } } },
        { $group: { _id: null, total: { $sum: '$data.totalTokens' } } },
      ]),
      this.eventModel.aggregate([
        { $match: { applicationId, timestamp: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      this.eventModel.aggregate([
        { $match: { applicationId, eventType: 'message_received', timestamp: { $gte: since } } },
        { $group: { _id: '$data.provider', count: { $sum: 1 } } },
      ]),
      this.eventModel.aggregate([
        { $match: { applicationId, eventType: 'message_sent', timestamp: { $gte: since } } },
        { $group: { _id: '$data.source', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      period: { days, since: since.toISOString() },
      conversations: totalConversations,
      messages: totalMessages,
      totalTokens: totalTokens[0]?.total || 0,
      dailyActivity,
      providerBreakdown,
      sourceBreakdown,
    };
  }

  async getRecentEvents(applicationId: string, limit = 50) {
    return this.eventModel
      .find({ applicationId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }
}
