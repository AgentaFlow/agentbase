import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  RawBodyRequest,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Optional,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
} from "@nestjs/swagger";
import { BillingService } from "./billing.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TeamGuard } from "../../common/guards/team.guard";
import { ConfigService } from "@nestjs/config";
import { PlanTier } from "../../database/entities";
import { STRIPE_CLIENT } from "../stripe/stripe.module";
import Stripe from "stripe";

@ApiTags("billing")
@Controller("billing")
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly config: ConfigService,
    @Optional() @Inject(STRIPE_CLIENT) private readonly stripe: Stripe | null,
  ) {}

  @Get("plans")
  @ApiOperation({ summary: "Get available plans" })
  getPlans() {
    return this.billingService.getPlans();
  }

  @Get("usage")
  @UseGuards(JwtAuthGuard, TeamGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: "x-team-id",
    required: false,
    description: "Team ID for team-scoped billing",
  })
  @ApiOperation({ summary: "Get current usage and plan details" })
  async getUsage(@Request() req: any) {
    return this.billingService.getUsage(req.user.sub, req.teamId);
  }

  @Post("checkout")
  @UseGuards(JwtAuthGuard, TeamGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: "x-team-id",
    required: false,
    description: "Team ID for team-scoped billing",
  })
  @ApiOperation({ summary: "Create Stripe checkout session for plan upgrade" })
  async createCheckout(@Request() req: any, @Body() body: { plan: PlanTier }) {
    return this.billingService.createCheckoutSession(
      req.user.sub,
      body.plan,
      req.teamId,
    );
  }

  @Post("portal")
  @UseGuards(JwtAuthGuard, TeamGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: "x-team-id",
    required: false,
    description: "Team ID for team-scoped billing",
  })
  @ApiOperation({ summary: "Create Stripe customer portal session" })
  async createPortal(@Request() req: any) {
    return this.billingService.createPortalSession(req.user.sub, req.teamId);
  }

  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Stripe webhook endpoint" })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ) {
    const webhookSecret = this.config.get("STRIPE_WEBHOOK_SECRET");

    if (!this.stripe || !webhookSecret) {
      // Dev mode: accept raw body
      const event =
        typeof req.body === "string" ? JSON.parse(req.body as any) : req.body;
      await this.billingService.handleStripeWebhook(event);
      return { received: true };
    }

    const event = this.stripe.webhooks.constructEvent(
      (req as any).rawBody,
      signature,
      webhookSecret,
    );

    await this.billingService.handleStripeWebhook(event);
    return { received: true };
  }

  // ──────────────────────────────────────────────────
  // Stripe Connect endpoints (marketplace developer onboarding)
  // ──────────────────────────────────────────────────

  @Post("connect/onboard")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create Stripe Connect Express account for marketplace developer",
  })
  async connectOnboard(@Request() req: any) {
    return this.billingService.createConnectAccount(
      req.user.sub,
      req.user.email,
    );
  }

  @Post("connect/login")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get Stripe Connect dashboard login link" })
  async connectLogin(
    @Request() req: any,
    @Body() body: { stripeAccountId: string },
  ) {
    return this.billingService.createConnectLoginLink(body.stripeAccountId);
  }

  @Get("connect/status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get Stripe Connect account status" })
  async connectStatus(
    @Request() req: any,
    @Query("accountId") accountId: string,
  ) {
    return this.billingService.getConnectAccountStatus(accountId);
  }
}
