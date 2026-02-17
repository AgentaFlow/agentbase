import {
  Controller, Get, Post, Body, Query, UseGuards, Request,
  RawBodyRequest, Req, Headers, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { PlanTier } from '../../database/entities';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly config: ConfigService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get available plans' })
  getPlans() {
    return this.billingService.getPlans();
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current usage and plan details' })
  async getUsage(@Request() req: any) {
    return this.billingService.getUsage(req.user.sub);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe checkout session for plan upgrade' })
  async createCheckout(@Request() req: any, @Body() body: { plan: PlanTier }) {
    return this.billingService.createCheckoutSession(req.user.sub, body.plan);
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe customer portal session' })
  async createPortal(@Request() req: any) {
    return this.billingService.createPortalSession(req.user.sub);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const stripeKey = this.config.get('STRIPE_SECRET_KEY');
    const webhookSecret = this.config.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeKey || !webhookSecret) {
      // Dev mode: accept raw body
      const event = typeof req.body === 'string' ? JSON.parse(req.body as any) : req.body;
      await this.billingService.handleStripeWebhook(event);
      return { received: true };
    }

    const stripe = require('stripe')(stripeKey);
    const event = stripe.webhooks.constructEvent(
      (req as any).rawBody,
      signature,
      webhookSecret,
    );

    await this.billingService.handleStripeWebhook(event);
    return { received: true };
  }
}
