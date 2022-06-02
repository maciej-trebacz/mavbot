import { Module } from "@nestjs/common";
import { DbModule } from "src/db";
import { TwitchModule } from "src/twitch";
import { EventService } from "./event.service";

@Module({
  imports: [DbModule, TwitchModule],
  providers: [EventService],
  exports: [EventService]
})
export class EventModule {}