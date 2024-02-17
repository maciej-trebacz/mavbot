import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ChatGPTService } from "./chatgpt.service";
import { TwitchModule } from "src/twitch";
import { PeopleModule } from "src/people";

@Module({
  imports: [ConfigModule, TwitchModule, PeopleModule],
  providers: [ChatGPTService],
  exports: [ChatGPTService]
})
export class ChatGPTModule {}