import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook } from '../../database/entities';
import { createHmac, randomBytes } from 'crypto';

export const WEBHOOK_EVENTS = [
  'message.sent',
  'message.received',
  'conversation.started',
  'conversation.ended',
  'application.created',
  'application.updated',
  'plugin.installed',
  'plugin.uninstalled',
  'api_key.created',
  'usage.limit_reached',
  'subscription.changed',
] as const;

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(Webhook)
    private readonly webhookRepo: Repository<Webhook>,
  ) {}

  async create(ownerId: string, data: {
    name: string;
    url: string;
    events?: string[];
    applicationId?: string;
  }): Promise<Webhook> {
    const secret = `whsec_${randomBytes(24).toString('hex')}`;
    const webhook = this.webhookRepo.create({
      ...data,
      ownerId,
      secret,
      events: data.events || ['message.sent', 'conversation.started'],
    });
    const saved = await this.webhookRepo.save(webhook);
    this.logger.log(`Webhook created: ${saved.name} for user ${ownerId}`);
    return saved;
  }

  async findByOwner(ownerId: string): Promise<Webhook[]> {
    return this.webhookRepo.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, ownerId: string): Promise<Webhook> {
    const hook = await this.webhookRepo.findOne({ where: { id, ownerId } });
    if (!hook) throw new NotFoundException('Webhook not found');
    return hook;
  }

  async update(id: string, ownerId: string, data: Partial<Webhook>): Promise<Webhook> {
    const hook = await this.findById(id, ownerId);
    Object.assign(hook, data);
    return this.webhookRepo.save(hook);
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const result = await this.webhookRepo.delete({ id, ownerId });
    if (result.affected === 0) throw new NotFoundException('Webhook not found');
  }

  async toggleActive(id: string, ownerId: string): Promise<Webhook> {
    const hook = await this.findById(id, ownerId);
    hook.isActive = !hook.isActive;
    return this.webhookRepo.save(hook);
  }

  /**
   * Dispatch an event to all matching webhooks.
   */
  async dispatch(event: string, payload: any, applicationId?: string) {
    const conditions: any = { isActive: true };
    const webhooks = await this.webhookRepo.find({ where: conditions });

    const matching = webhooks.filter(w => {
      if (w.applicationId && applicationId && w.applicationId !== applicationId) return false;
      return w.events.includes(event) || w.events.includes('*');
    });

    const results = await Promise.allSettled(
      matching.map(w => this.deliverWebhook(w, event, payload)),
    );

    const delivered = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    if (matching.length > 0) {
      this.logger.log(`Webhook dispatch: ${event} → ${delivered} delivered, ${failed} failed`);
    }
  }

  private async deliverWebhook(webhook: Webhook, event: string, payload: any) {
    const body = JSON.stringify({
      id: `evt_${randomBytes(12).toString('hex')}`,
      type: event,
      data: payload,
      timestamp: new Date().toISOString(),
    });

    const signature = createHmac('sha256', webhook.secret || '')
      .update(body)
      .digest('hex');

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agentbase-Signature': `sha256=${signature}`,
          'X-Agentbase-Event': event,
          'User-Agent': 'Agentbase-Webhook/1.0',
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      await this.webhookRepo.update(webhook.id, {
        lastTriggeredAt: new Date(),
        totalDeliveries: () => '"totalDeliveries" + 1',
        ...(response.ok ? { lastError: null } : {
          failedDeliveries: () => '"failedDeliveries" + 1',
          lastError: `HTTP ${response.status}`,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (err: any) {
      await this.webhookRepo.update(webhook.id, {
        lastTriggeredAt: new Date(),
        totalDeliveries: () => '"totalDeliveries" + 1',
        failedDeliveries: () => '"failedDeliveries" + 1',
        lastError: err.message,
      });
      throw err;
    }
  }

  /**
   * Test a webhook by sending a ping event.
   */
  async test(id: string, ownerId: string): Promise<{ success: boolean; error?: string }> {
    const hook = await this.findById(id, ownerId);
    try {
      await this.deliverWebhook(hook, 'ping', { message: 'Webhook test from Agentbase' });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
