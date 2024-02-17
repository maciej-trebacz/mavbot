import { Module } from '@nestjs/common';
import { SettingsModule } from 'src/settings/settings.module';
import { TwitchModule } from 'src/twitch';
import { StreamlabsModule } from 'src/streamlabs';
import { PeopleModule } from 'src/people';
import { BotService } from './bot.service';
import { EventModule } from 'src/event';
import { PsnModule } from 'src/psn';
import { ChatGPTModule } from 'src/chatgpt';

@Module({
  imports: [
    SettingsModule,
    TwitchModule,
    StreamlabsModule,
    EventModule,
    PeopleModule,
    PsnModule,
    ChatGPTModule,
  ],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
