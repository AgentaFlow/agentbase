import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStripeMeteredFields1710900000000 implements MigrationInterface {
  name = "AddStripeMeteredFields1710900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // stripeSubscriptionItemId: needed to report usage records to Stripe metered billing.
    // This is the ID of the line item on the Stripe subscription (not the subscription itself).
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
        ADD COLUMN IF NOT EXISTS "stripeSubscriptionItemId" varchar NULL,
        ADD COLUMN IF NOT EXISTS "stripeMeteredPriceId"     varchar NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
        DROP COLUMN IF EXISTS "stripeSubscriptionItemId",
        DROP COLUMN IF EXISTS "stripeMeteredPriceId"
    `);
  }
}
