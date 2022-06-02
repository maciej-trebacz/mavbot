import { Module } from "@nestjs/common";
import { DbModule } from "src/db";
import { DiscordService } from "./discord.service";

@Module({
  imports: [DbModule],
  providers: [DiscordService],
  exports: [DiscordService]
})
export class DiscordModule {}