import { Module, Global, DynamicModule, Logger } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import Stripe from "stripe";

export const STRIPE_CLIENT = "STRIPE_CLIENT";

/**
 * Global module providing a configured Stripe client via dependency injection.
 * Inject using @Inject(STRIPE_CLIENT) stripe: Stripe
 *
 * If STRIPE_SECRET_KEY is not set, a warning is logged and a null-safe
 * proxy is provided for dev mode.
 */
@Global()
@Module({})
export class StripeModule {
  private static readonly logger = new Logger("StripeModule");

  static forRoot(): DynamicModule {
    return {
      module: StripeModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: STRIPE_CLIENT,
          inject: [ConfigService],
          useFactory: (config: ConfigService): Stripe | null => {
            const secretKey = config.get<string>("STRIPE_SECRET_KEY");

            if (!secretKey) {
              StripeModule.logger.warn(
                "STRIPE_SECRET_KEY not configured — Stripe features disabled. " +
                  "Set STRIPE_SECRET_KEY in .env for production.",
              );
              return null;
            }

            const stripe = new Stripe(secretKey, {
              typescript: true,
              appInfo: {
                name: "Agentbase",
                version: "0.1.0",
                url: "https://agentbase.dev",
              },
            });

            StripeModule.logger.log("Stripe client initialized");
            return stripe;
          },
        },
      ],
      exports: [STRIPE_CLIENT],
    };
  }
}
