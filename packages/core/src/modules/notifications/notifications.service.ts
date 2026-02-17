import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from '../../database/schemas/notification.schema';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notifModel: Model<NotificationDocument>,
  ) {}

  async create(data: {
    userId: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message?: string;
    actionUrl?: string;
    actionLabel?: string;
    category?: string;
    metadata?: Record<string, any>;
  }) {
    const notif = new this.notifModel(data);
    const saved = await notif.save();
    this.logger.debug(`Notification created for ${data.userId}: ${data.title}`);
    return saved;
  }

  async findByUser(userId: string, options?: {
    unreadOnly?: boolean;
    limit?: number;
    skip?: number;
    category?: string;
  }) {
    const query: any = { userId };
    if (options?.unreadOnly) query.read = false;
    if (options?.category) query.category = options.category;

    const limit = options?.limit || 20;
    const skip = options?.skip || 0;

    const [notifications, total, unreadCount] = await Promise.all([
      this.notifModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.notifModel.countDocuments(query),
      this.notifModel.countDocuments({ userId, read: false }),
    ]);

    return { notifications, total, unreadCount };
  }

  async markRead(notificationId: string, userId: string) {
    const notif = await this.notifModel.findOne({ _id: notificationId, userId });
    if (!notif) throw new NotFoundException('Notification not found');
    notif.read = true;
    return notif.save();
  }

  async markAllRead(userId: string) {
    const result = await this.notifModel.updateMany(
      { userId, read: false },
      { $set: { read: true } },
    );
    return { updated: result.modifiedCount };
  }

  async delete(notificationId: string, userId: string) {
    const result = await this.notifModel.deleteOne({ _id: notificationId, userId });
    if (result.deletedCount === 0) throw new NotFoundException('Notification not found');
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notifModel.countDocuments({ userId, read: false });
  }

  // --- Convenience helpers for other services to call ---

  async notifyUsageWarning(userId: string, resource: string, percent: number) {
    return this.create({
      userId,
      type: 'warning',
      title: `${resource} usage at ${percent}%`,
      message: `Your ${resource.toLowerCase()} usage has reached ${percent}% of your plan limit. Consider upgrading.`,
      actionUrl: '/dashboard/billing',
      actionLabel: 'View Plans',
      category: 'billing',
    });
  }

  async notifySubscriptionChanged(userId: string, plan: string, action: string) {
    return this.create({
      userId,
      type: 'success',
      title: `Subscription ${action}`,
      message: `Your plan has been ${action} to ${plan}.`,
      actionUrl: '/dashboard/billing',
      actionLabel: 'View Billing',
      category: 'billing',
    });
  }

  async notifyTeamInvite(userId: string, teamName: string, teamId: string) {
    return this.create({
      userId,
      type: 'info',
      title: `You've been added to ${teamName}`,
      message: `You are now a member of the "${teamName}" team.`,
      actionUrl: `/dashboard/team?id=${teamId}`,
      actionLabel: 'View Team',
      category: 'team',
    });
  }

  async notifyDocumentProcessed(userId: string, fileName: string, status: string) {
    return this.create({
      userId,
      type: status === 'ready' ? 'success' : 'error',
      title: status === 'ready' ? `"${fileName}" processed` : `"${fileName}" processing failed`,
      message: status === 'ready'
        ? `Your document has been chunked and is ready for search.`
        : `There was an error processing your document. Please try again.`,
      actionUrl: '/dashboard/knowledge',
      actionLabel: 'View Knowledge Bases',
      category: 'knowledge',
    });
  }

  async notifyWebhookFailure(userId: string, webhookName: string, error: string) {
    return this.create({
      userId,
      type: 'error',
      title: `Webhook "${webhookName}" failing`,
      message: `Last delivery failed: ${error}`,
      actionUrl: '/dashboard/webhooks',
      actionLabel: 'View Webhooks',
      category: 'webhook',
    });
  }
}
