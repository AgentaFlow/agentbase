import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThanOrEqual } from "typeorm";
import {
  Subscription,
  PlanTier,
  SubscriptionStatus,
} from "../../database/entities";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { STRIPE_CLIENT } from "../stripe/stripe.module";
import Stripe from "stripe";

/** Plan definitions with limits and Stripe price IDs */
export const PLAN_DEFINITIONS = {
  [PlanTier.FREE]: {
    name: "Free",
    price: 0,
    tokenLimit: 10_000,
    appLimit: 3,
    messagesLimit: 1_000,
    apiKeyLimit: 2,
    stripePriceId: null,
    features: [
      "3 Applications",
      "10K tokens/mo",
      "1K messages/mo",
      "2 API Keys",
      "Community support",
    ],
  },
  [PlanTier.STARTER]: {
    name: "Starter",
    price: 29,
    tokenLimit: 100_000,
    appLimit: 10,
    messagesLimit: 10_000,
    apiKeyLimit: 5,
    stripePriceId: "price_starter_monthly",
    features: [
      "10 Applications",
      "100K tokens/mo",
      "10K messages/mo",
      "5 API Keys",
      "Email support",
      "Custom themes",
    ],
  },
  [PlanTier.PRO]: {
    name: "Pro",
    price: 99,
    tokenLimit: 1_000_000,
    appLimit: 50,
    messagesLimit: 100_000,
    apiKeyLimit: 25,
    stripePriceId: "price_pro_monthly",
    features: [
      "50 Applications",
      "1M tokens/mo",
      "100K messages/mo",
      "25 API Keys",
      "Priority support",
      "Custom themes",
      "Webhooks",
      "White-label",
    ],
  },
  [PlanTier.ENTERPRISE]: {
    name: "Enterprise",
    price: 499,
    tokenLimit: 10_000_000,
    appLimit: 999,
    messagesLimit: 1_000_000,
    apiKeyLimit: 100,
    stripePriceId: "price_enterprise_monthly",
    features: [
      "Unlimited Applications",
      "10M tokens/mo",
      "1M messages/mo",
      "100 API Keys",
      "Dedicated support",
      "SLA",
      "SSO",
      "On-premise option",
    ],
  },
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    private readonly config: ConfigService,
    @Optional() @Inject(STRIPE_CLIENT) private readonly stripe: Stripe | null,
  ) {}

  async getOrCreateSubscription(
    userId: string,
    teamId?: string,
  ): Promise<Subscription> {
    // If teamId provided, try team-scoped lookup first
    if (teamId) {
      let sub = await this.subRepo.findOne({ where: { teamId } });
      if (!sub) {
        sub = this.subRepo.create({
          userId,
          teamId,
          plan: PlanTier.FREE,
          status: SubscriptionStatus.ACTIVE,
          ...this.getLimitsForPlan(PlanTier.FREE),
        });
        sub = await this.subRepo.save(sub);
        this.logger.log(`Created free subscription for team ${teamId}`);
      }
      return sub;
    }

    // Fallback to user-scoped lookup
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

  async getSubscription(
    userId: string,
    teamId?: string,
  ): Promise<Subscription | null> {
    if (teamId) {
      return this.subRepo.findOne({ where: { teamId } });
    }
    return this.subRepo.findOne({ where: { userId } });
  }

  async getTeamSubscription(teamId: string): Promise<Subscription | null> {
    return this.subRepo.findOne({ where: { teamId } });
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
  async createCheckoutSession(
    userId: string,
    plan: PlanTier,
    teamId?: string,
  ): Promise<{ url: string }> {
    const planDef = PLAN_DEFINITIONS[plan];

    if (!planDef || !planDef.stripePriceId) {
      throw new BadRequestException("Invalid plan or free plan selected");
    }

    let sub = await this.getOrCreateSubscription(userId, teamId);

    if (!this.stripe) {
      // Dev mode: simulate upgrade directly
      this.logger.warn("Stripe not configured — simulating checkout");
      sub.plan = plan;
      sub.status = SubscriptionStatus.ACTIVE;
      Object.assign(sub, this.getLimitsForPlan(plan));
      sub.currentPeriodStart = new Date();
      sub.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      sub.tokensUsed = 0;
      sub.messagesUsed = 0;
      await this.subRepo.save(sub);
      return {
        url: `${this.config.get("FRONTEND_URL", "http://localhost:3000")}/dashboard/billing?success=true&plan=${plan}`,
      };
    }

    if (!sub.stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        metadata: { userId, ...(teamId ? { teamId } : {}) },
      });
      sub.stripeCustomerId = customer.id;
      await this.subRepo.save(sub);
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: sub.stripeCustomerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: planDef.stripePriceId, quantity: 1 }],
      success_url: `${this.config.get("FRONTEND_URL")}/dashboard/billing?success=true&plan=${plan}`,
      cancel_url: `${this.config.get("FRONTEND_URL")}/dashboard/billing?canceled=true`,
      metadata: { userId, plan, ...(teamId ? { teamId } : {}) },
    });

    return { url: session.url! };
  }

  /**
   * Create a Stripe Customer Portal session for managing billing.
   */
  async createPortalSession(
    userId: string,
    teamId?: string,
  ): Promise<{ url: string }> {
    const sub = await this.getSubscription(userId, teamId);
    if (!sub?.stripeCustomerId) {
      throw new BadRequestException("No active subscription found");
    }

    if (!this.stripe) {
      return {
        url: `${this.config.get("FRONTEND_URL", "http://localhost:3000")}/dashboard/billing`,
      };
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${this.config.get("FRONTEND_URL")}/dashboard/billing`,
    });

    return { url: session.url! };
  }

  /**
   * Handle Stripe webhook events.
   */
  async handleStripeWebhook(event: any) {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const plan = session.metadata.plan as PlanTier;
        const teamId = session.metadata.teamId;
        const sub = await this.getOrCreateSubscription(userId, teamId);
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

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const sub = await this.subRepo.findOne({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (sub) {
          sub.status = subscription.status as SubscriptionStatus;
          sub.currentPeriodStart = new Date(
            subscription.current_period_start * 1000,
          );
          sub.currentPeriodEnd = new Date(
            subscription.current_period_end * 1000,
          );
          if (subscription.cancel_at)
            sub.canceledAt = new Date(subscription.cancel_at * 1000);
          await this.subRepo.save(sub);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const sub = await this.subRepo.findOne({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (sub) {
          sub.plan = PlanTier.FREE;
          sub.status = SubscriptionStatus.CANCELED;
          sub.canceledAt = new Date();
          Object.assign(sub, this.getLimitsForPlan(PlanTier.FREE));
          await this.subRepo.save(sub);
          this.logger.log(
            `Subscription canceled, reverted to free: ${sub.userId}`,
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const sub = await this.subRepo.findOne({
          where: { stripeCustomerId: invoice.customer },
        });
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
  async trackUsage(
    userId: string,
    tokens: number,
    teamId?: string,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const sub = await this.getOrCreateSubscription(userId, teamId);
    const newTokens = Number(sub.tokensUsed) + tokens;
    const newMessages = sub.messagesUsed + 1;

    if (newTokens > sub.tokenLimit || newMessages > sub.messagesLimit) {
      return {
        allowed: false,
        remaining: Math.max(0, sub.tokenLimit - Number(sub.tokensUsed)),
      };
    }

    await this.subRepo.update(sub.id, {
      tokensUsed: newTokens,
      messagesUsed: newMessages,
    });

    return { allowed: true, remaining: sub.tokenLimit - newTokens };
  }

  async getUsage(userId: string, teamId?: string) {
    const sub = await this.getOrCreateSubscription(userId, teamId);
    const planDef = PLAN_DEFINITIONS[sub.plan];
    return {
      plan: sub.plan,
      planName: planDef.name,
      status: sub.status,
      tokens: {
        used: Number(sub.tokensUsed),
        limit: sub.tokenLimit,
        percent: Math.round((Number(sub.tokensUsed) / sub.tokenLimit) * 100),
      },
      messages: {
        used: sub.messagesUsed,
        limit: sub.messagesLimit,
        percent: Math.round((sub.messagesUsed / sub.messagesLimit) * 100),
      },
      apps: { limit: sub.appLimit },
      apiKeys: { limit: sub.apiKeyLimit },
      period: { start: sub.currentPeriodStart, end: sub.currentPeriodEnd },
      stripeCustomerId: sub.stripeCustomerId,
    };
  }

  /**
   * Reset usage counters (called at billing cycle renewal).
   */
  async resetUsage(userId: string, teamId?: string) {
    const sub = await this.getSubscription(userId, teamId);
    if (!sub) return;
    await this.subRepo.update(sub.id, { tokensUsed: 0, messagesUsed: 0 });
  }

  // ──────────────────────────────────────────────────
  // Cron: auto-reset usage for subscriptions at period end
  // ──────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_HOUR)
  async handleUsageResetCron() {
    const now = new Date();
    const expiredSubs = await this.subRepo.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: LessThanOrEqual(now),
      },
    });

    for (const sub of expiredSubs) {
      sub.tokensUsed = 0;
      sub.messagesUsed = 0;
      sub.currentPeriodStart = now;
      sub.currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await this.subRepo.save(sub);
    }

    if (expiredSubs.length > 0) {
      this.logger.log(
        `Reset usage counters for ${expiredSubs.length} subscriptions`,
      );
    }
  }

  // ──────────────────────────────────────────────────
  // Stripe Connect Express — Marketplace developer payouts
  // ──────────────────────────────────────────────────

  /**
   * Create a Stripe Connect Express account for a marketplace developer.
   * Returns the onboarding URL.
   */
  async createConnectAccount(
    userId: string,
    email: string,
  ): Promise<{ accountId: string; onboardingUrl: string }> {
    if (!this.stripe) {
      throw new BadRequestException("Stripe not configured");
    }

    const account = await this.stripe.accounts.create({
      type: "express",
      email,
      metadata: { userId },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    const accountLink = await this.stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${this.config.get("FRONTEND_URL")}/dashboard/marketplace/connect?refresh=true`,
      return_url: `${this.config.get("FRONTEND_URL")}/dashboard/marketplace/connect?success=true`,
      type: "account_onboarding",
    });

    return { accountId: account.id, onboardingUrl: accountLink.url };
  }

  /**
   * Create a Connect login link for an existing connected account.
   */
  async createConnectLoginLink(
    stripeAccountId: string,
  ): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new BadRequestException("Stripe not configured");
    }

    const loginLink =
      await this.stripe.accounts.createLoginLink(stripeAccountId);
    return { url: loginLink.url };
  }

  /**
   * Process a marketplace plugin/theme purchase.
   * Platform takes 20% fee, developer gets 80%.
   */
  async processMarketplacePurchase(params: {
    buyerUserId: string;
    developerStripeAccountId: string;
    amount: number; // in cents
    description: string;
    metadata?: Record<string, string>;
  }): Promise<{ paymentIntentId: string; clientSecret: string }> {
    if (!this.stripe) {
      throw new BadRequestException("Stripe not configured");
    }

    const platformFee = Math.round(params.amount * 0.2); // 20% platform fee

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: "usd",
      description: params.description,
      application_fee_amount: platformFee,
      transfer_data: {
        destination: params.developerStripeAccountId,
      },
      metadata: {
        buyerUserId: params.buyerUserId,
        ...params.metadata,
      },
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
    };
  }

  /**
   * Get Stripe Connect account status for a developer.
   */
  async getConnectAccountStatus(stripeAccountId: string): Promise<{
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  }> {
    if (!this.stripe) {
      return {
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      };
    }

    const account = await this.stripe.accounts.retrieve(stripeAccountId);
    return {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    };
  }
}
