import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Subscription } from "../../database/entities";
import { BillingService } from "./billing.service";
import { BillingController } from "./billing.controller";
import { TeamsModule } from "../teams/teams.module";

@Module({
  imports: [TypeOrmModule.forFeature([Subscription]), TeamsModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
