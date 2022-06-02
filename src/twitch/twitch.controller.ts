import axios from 'axios';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from 'src/settings';
import { TwitchSettings, TWITCH_MODULE } from './twitch.service';

@Controller('twitch')
export class TwitchController {
  constructor(private configService: ConfigService, private settingsService: SettingsService) {
  }
  @Get('/authorize/:type')
  async authorize(@Param() params, @Query() query) {
    const redirectUri = this.configService.get('REDIRECT_URI') + '/twitch/authorize/' + params.type;
    const settings = await this.settingsService.get(TWITCH_MODULE) as TwitchSettings;
    const url = `https://id.twitch.tv/oauth2/token?client_id=${settings.clientId}&client_secret=${settings.clientSecret}&code=${query.code}&grant_type=authorization_code&redirect_uri=${redirectUri}`
    
    try {
      const response = await axios.post(url);
      const tokenData = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn:  new Date().getTime() + (response.data.expires_in * 1000),
        obtainmentTimestamp: new Date().getTime()
      };
      if (params.type === 'api') {
        settings.apiTokens = tokenData;
      } else {
        settings.chatTokens = tokenData;
      }
      await this.settingsService.update(TWITCH_MODULE, settings);
      return 'Saved!';
    } catch (e) {
      return 'Error while getting Twitch token: ' + e.response.data.message;
    }
  }
}
