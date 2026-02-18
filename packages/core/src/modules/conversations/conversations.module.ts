import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  Conversation,
  ConversationSchema,
} from "../../database/schemas/conversation.schema";
import {
  ModelConfig,
  ModelConfigSchema,
} from "../../database/schemas/model-config.schema";
import { ConversationsService } from "./conversations.service";
import { ConversationsController } from "./conversations.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: ModelConfig.name, schema: ModelConfigSchema },
    ]),
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
