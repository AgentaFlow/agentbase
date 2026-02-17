import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../../database/schemas/audit-log.schema';

export interface AuditEntry {
  userId: string;
  userEmail?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  outcome?: 'success' | 'failure' | 'warning';
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditModel: Model<AuditLogDocument>,
  ) {}

  async log(entry: AuditEntry) {
    const log = new this.auditModel({
      ...entry,
      timestamp: new Date(),
    });
    await log.save();
    this.logger.debug(`Audit: ${entry.action} by ${entry.userId} on ${entry.resource || '-'}/${entry.resourceId || '-'}`);
  }

  async query(filters: {
    userId?: string;
    action?: string;
    resource?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    skip?: number;
  }) {
    const query: any = {};
    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = { $regex: filters.action, $options: 'i' };
    if (filters.resource) query.resource = filters.resource;
    if (filters.from || filters.to) {
      query.timestamp = {};
      if (filters.from) query.timestamp.$gte = filters.from;
      if (filters.to) query.timestamp.$lte = filters.to;
    }

    const limit = filters.limit || 50;
    const skip = filters.skip || 0;

    const [logs, total] = await Promise.all([
      this.auditModel.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).exec(),
      this.auditModel.countDocuments(query),
    ]);

    return { logs, total, limit, skip };
  }

  async getUserActivity(userId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.auditModel.aggregate([
      { $match: { userId, timestamp: { $gte: since } } },
      { $group: { _id: '$action', count: { $sum: 1 }, lastOccurrence: { $max: '$timestamp' } } },
      { $sort: { count: -1 } },
    ]);
  }

  async getSecurityEvents(limit = 100) {
    return this.auditModel
      .find({
        action: {
          $in: ['auth.login', 'auth.login_failed', 'auth.password_changed',
                'api_key.created', 'api_key.revoked', 'user.role_changed',
                'user.disabled', 'admin.action'],
        },
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }
}
