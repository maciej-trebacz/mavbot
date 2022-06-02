import { Controller, Get, Render } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings';
import { TWITCH_MODULE } from './twitch/twitch.service';
import { STREAMLABS_MODULE } from './streamlabs/streamlabs.service';

@Controller()
export class AppController {
  constructor(private readonly settingsService: SettingsService, private readonly configService: ConfigService) {}

  @Get()
  @Render('index')
  async root() {
    const redirectUri = this.configService.get('REDIRECT_URI');
    return { 
      twitchSettings: await this.settingsService.get(TWITCH_MODULE),
      streamlabsSettings: await this.settingsService.get(STREAMLABS_MODULE),
      redirectUri
    }
  }
}
