import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ChatGPTService } from "./chatgpt.service";

@Module({
  imports: [ConfigModule],
  providers: [ChatGPTService],
  exports: [ChatGPTService]
})
export class ChatGPTModule {}