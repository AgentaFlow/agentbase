import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserProviderKey } from "../../database/entities";
import { ProviderKeysService } from "./provider-keys.service";
import { ProviderKeysController } from "./provider-keys.controller";

@Module({
  imports: [TypeOrmModule.forFeature([UserProviderKey])],
  controllers: [ProviderKeysController],
  providers: [ProviderKeysService],
  exports: [ProviderKeysService],
})
export class ProviderKeysModule {}
