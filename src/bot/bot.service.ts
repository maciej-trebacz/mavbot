import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from 'src/settings';
import { TwitchService } from 'src/twitch';
import { StreamlabsService } from 'src/streamlabs';
import { EventService } from 'src/event';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(private settingsService: SettingsService, private twitchService: TwitchService, 
    private streamlabsService: StreamlabsService, private eventService: EventService) {}

  async init(channelId: string) {
    try {
      await this.settingsService.fetch(channelId);
    } catch (e) {
      this.logger.error(`Failed to fetch settings for channel ${channelId}: ${e}`);
      return;
    }

    await Promise.all([
      this.twitchService.init(channelId),
      // this.streamlabsService.init(channelId),
    ]);

    await this.eventService.init(channelId)
  }
}