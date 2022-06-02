import { Module } from "@nestjs/common";
import { SettingsModule } from 'src/settings/settings.module';
import { TwitchModule } from "src/twitch";
import { StreamlabsModule } from 'src/streamlabs';
import { BotService } from './bot.service';
import { EventModule } from "src/event";

@Module({
  imports: [SettingsModule, TwitchModule, StreamlabsModule, EventModule],
  providers: [BotService],
  exports: [BotService]
})
export class BotModule {}