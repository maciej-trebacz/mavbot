import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from 'src/settings';
import { TwitchService } from 'src/twitch';
import { StreamlabsService } from 'src/streamlabs';
import { EventService } from 'src/event';
import { PeopleService } from 'src/people';
import { PsnService } from 'src/psn';
import { ChatGPTService } from 'src/chatgpt';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private settingsService: SettingsService,
    private twitchService: TwitchService,
    private streamlabsService: StreamlabsService,
    private eventService: EventService,
    private peopleService: PeopleService,
    private psnService: PsnService,
    private chatGPTService: ChatGPTService,
  ) {}

  async init(channelId: string) {
    try {
      await this.settingsService.fetch(channelId);
    } catch (e) {
      this.logger.error(
        `Failed to fetch settings for channel ${channelId}: ${e}`,
      );
      return;
    }

    await Promise.all([
      this.twitchService.init(channelId),
      // this.streamlabsService.init(channelId),
      this.psnService.init(),
      this.chatGPTService.init(),
    ]);

    await this.eventService.init(channelId);
    await this.peopleService.init(channelId);
  }
}
