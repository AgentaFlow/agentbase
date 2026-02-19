import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Application } from "../../database/entities";
import { ApplicationsService } from "./applications.service";
import { ApplicationsController } from "./applications.controller";
import { BillingModule } from "../billing/billing.module";

@Module({
  imports: [TypeOrmModule.forFeature([Application]), BillingModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
