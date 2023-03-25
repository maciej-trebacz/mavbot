import { Module } from "@nestjs/common";
import { DbModule } from "src/db";
import { TwitchModule } from "src/twitch";
import { ChatGPTModule } from "src/chatgpt";
import { EventService } from "./event.service";

@Module({
  imports: [DbModule, TwitchModule, ChatGPTModule],
  providers: [EventService],
  exports: [EventService]
})
export class EventModule {}