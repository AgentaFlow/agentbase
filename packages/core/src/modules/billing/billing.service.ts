import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, PlanTier, SubscriptionStatus } from '../../database/entities';
import { ConfigService } from '@nestjs/config';

/** Plan definitions with limits and Stripe price IDs */
export const PLAN_DEFINITIONS = {
  [PlanTier.FREE]: {
    name: 'Free',
    price: 0,
    tokenLimit: 10_000,
    appLimit: 3,
    messagesLimit: 1_000,
    apiKeyLimit: 2,
    stripePriceId: null,
    features: ['3 Applications', '10K tokens/mo', '1K messages/mo', '2 API Keys', 'Community support'],
  },
  [PlanTier.STARTER]: {
    name: 'Starter',
    price: 29,
    tokenLimit: 100_000,
    appLimit: 10,
    messagesLimit: 10_000,
    apiKeyLimit: 5,
    stripePriceId: 'price_starter_monthly',
    features: ['10 Applications', '100K tokens/mo', '10K messages/mo', '5 API Keys', 'Email support', 'Custom themes'],
  },
  [PlanTier.PRO]: {
    name: 'Pro',
    price: 99,
    tokenLimit: 1_000_000,
    appLimit: 50,
    messagesLimit: 100_000,
    apiKeyLimit: 25,
    stripePriceId: 'price_pro_monthly',
    features: ['50 Applications', '1M tokens/mo', '100K messages/mo', '25 API Keys', 'Priority support', 'Custom themes', 'Webhooks', 'White-label'],
  },
  [PlanTier.ENTERPRISE]: {
    name: 'Enterprise',
    price: 499,
    tokenLimit: 10_000_000,
    appLimit: 999,
    messagesLimit: 1_000_000,
    apiKeyLimit: 100,
    stripePriceId: 'price_enterprise_monthly',
    features: ['Unlimited Applications', '10M tokens/mo', '1M messages/mo', '100 API Keys', 'Dedicated support', 'SLA', 'SSO', 'On-premise option'],
  },
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    private readonly config: ConfigService,
  ) {}

  async getOrCreateSubscription(userId: string): Promise<Subscription> {
    let sub = await this.subRepo.findOne({ where: { userId } });
    if (!sub) {
      sub = this.subRepo.create({
        userId,
        plan: PlanTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        ...this.getLimitsForPlan(PlanTier.FREE),
      });
      sub = await this.subRepo.save(sub);
      this.logger.log(`Created free subscription for user ${userId}`);
    }
    return sub;
  }

  async getSubscription(userId: string): Promise<Subscription | null> {
    return this.subRepo.findOne({ where: { userId } });
  }

  getLimitsForPlan(plan: PlanTier) {
    const def = PLAN_DEFINITIONS[plan];
    return {
      tokenLimit: def.tokenLimit,
      appLimit: def.appLimit,
      messagesLimit: def.messagesLimit,
      apiKeyLimit: def.apiKeyLimit,
    };
  }

  getPlans() {
    return Object.entries(PLAN_DEFINITIONS).map(([tier, def]) => ({
      tier,
      ...def,
    }));
  }

  /**
   * Create a Stripe Checkout session for plan upgrade.
   * Returns a mock session URL in dev mode.
   */
  async createCheckoutSession(userId: string, plan: PlanTier): Promise<{ url: string }> {
    const stripeKey = this.config.get('STRIPE_SECRET_KEY');
    const planDef = PLAN_DEFINITIONS[plan];

    if (!planDef || !planDef.stripePriceId) {
      throw new BadRequestException('Invalid plan or free plan selected');
    }

    let sub = await this.getOrCreateSubscription(userId);

    if (!stripeKey) {
      // Dev mode: simulate upgrade directly
      this.logger.warn('No Stripe key configured — simulating checkout');
      sub.plan = plan;
      sub.status = SubscriptionStatus.ACTIVE;
      Object.assign(sub, this.getLimitsForPlan(plan));
      sub.currentPeriodStart = new Date();
      sub.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      sub.tokensUsed = 0;
      sub.messagesUsed = 0;
      await this.subRepo.save(sub);
      return { url: `${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/dashboard/billing?success=true&plan=${plan}` };
    }

    // Production Stripe integration
    const stripe = require('stripe')(stripeKey);

    if (!sub.stripeCustomerId) {
      const customer = await stripe.customers.create({
        metadata: { userId },
      });
      sub.stripeCustomerId = customer.id;
      await this.subRepo.save(sub);
    }

    const session = await stripe.checkout.sessions.create({
      customer: sub.stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: planDef.stripePriceId, quantity: 1 }],
      success_url: `${this.config.get('FRONTEND_URL')}/dashboard/billing?success=true&plan=${plan}`,
      cancel_url: `${this.config.get('FRONTEND_URL')}/dashboard/billing?canceled=true`,
      metadata: { userId, plan },
    });

    return { url: session.url };
  }

  /**
   * Create a Stripe Customer Portal session for managing billing.
   */
  async createPortalSession(userId: string): Promise<{ url: string }> {
    const sub = await this.getSubscription(userId);
    if (!sub?.stripeCustomerId) {
      throw new BadRequestException('No active subscription found');
    }

    const stripeKey = this.config.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return { url: `${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/dashboard/billing` };
    }

    const stripe = require('stripe')(stripeKey);
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${this.config.get('FRONTEND_URL')}/dashboard/billing`,
    });

    return { url: session.url };
  }

  /**
   * Handle Stripe webhook events.
   */
  async handleStripeWebhook(event: any) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const plan = session.metadata.plan as PlanTier;
        const sub = await this.getOrCreateSubscription(userId);
        sub.plan = plan;
        sub.status = SubscriptionStatus.ACTIVE;
        sub.stripeSubscriptionId = session.subscription;
        Object.assign(sub, this.getLimitsForPlan(plan));
        sub.tokensUsed = 0;
        sub.messagesUsed = 0;
        await this.subRepo.save(sub);
        this.logger.log(`User ${userId} upgraded to ${plan}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const sub = await this.subRepo.findOne({ where: { stripeSubscriptionId: subscription.id } });
        if (sub) {
          sub.status = subscription.status as SubscriptionStatus;
          sub.currentPeriodStart = new Date(subscription.current_period_start * 1000);
          sub.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
          if (subscription.cancel_at) sub.canceledAt = new Date(subscription.cancel_at * 1000);
          await this.subRepo.save(sub);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const sub = await this.subRepo.findOne({ where: { stripeSubscriptionId: subscription.id } });
        if (sub) {
          sub.plan = PlanTier.FREE;
          sub.status = SubscriptionStatus.CANCELED;
          sub.canceledAt = new Date();
          Object.assign(sub, this.getLimitsForPlan(PlanTier.FREE));
          await this.subRepo.save(sub);
          this.logger.log(`Subscription canceled, reverted to free: ${sub.userId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const sub = await this.subRepo.findOne({ where: { stripeCustomerId: invoice.customer } });
        if (sub) {
          sub.status = SubscriptionStatus.PAST_DUE;
          await this.subRepo.save(sub);
          this.logger.warn(`Payment failed for user ${sub.userId}`);
        }
        break;
      }
    }
  }

  /**
   * Increment usage counters. Returns false if quota exceeded.
   */
  async trackUsage(userId: string, tokens: number): Promise<{ allowed: boolean; remaining: number }> {
    const sub = await this.getOrCreateSubscription(userId);
    const newTokens = Number(sub.tokensUsed) + tokens;
    const newMessages = sub.messagesUsed + 1;

    if (newTokens > sub.tokenLimit || newMessages > sub.messagesLimit) {
      return { allowed: false, remaining: Math.max(0, sub.tokenLimit - Number(sub.tokensUsed)) };
    }

    await this.subRepo.update(sub.id, {
      tokensUsed: newTokens,
      messagesUsed: newMessages,
    });

    return { allowed: true, remaining: sub.tokenLimit - newTokens };
  }

  async getUsage(userId: string) {
    const sub = await this.getOrCreateSubscription(userId);
    const planDef = PLAN_DEFINITIONS[sub.plan];
    return {
      plan: sub.plan,
      planName: planDef.name,
      status: sub.status,
      tokens: { used: Number(sub.tokensUsed), limit: sub.tokenLimit, percent: Math.round((Number(sub.tokensUsed) / sub.tokenLimit) * 100) },
      messages: { used: sub.messagesUsed, limit: sub.messagesLimit, percent: Math.round((sub.messagesUsed / sub.messagesLimit) * 100) },
      apps: { limit: sub.appLimit },
      apiKeys: { limit: sub.apiKeyLimit },
      period: { start: sub.currentPeriodStart, end: sub.currentPeriodEnd },
      stripeCustomerId: sub.stripeCustomerId,
    };
  }

  /**
   * Reset usage counters (called at billing cycle renewal).
   */
  async resetUsage(userId: string) {
    const sub = await this.getSubscription(userId);
    if (!sub) return;
    await this.subRepo.update(sub.id, { tokensUsed: 0, messagesUsed: 0 });
  }
}
