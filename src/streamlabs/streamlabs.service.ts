import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from 'src/settings';
import io, {Socket} from 'socket.io-client';

interface StreamlabsTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface StreamlabsSettings {
  clientId: string;
  clientSecret: string;
  tokens: StreamlabsTokens;
}

export const STREAMLABS_MODULE = 'streamlabs';

@Injectable()
export class StreamlabsService {
  private readonly logger = new Logger(StreamlabsService.name);
  private channelId: string;
  private settings: StreamlabsSettings;
  private socket: Socket;
  private urls = {
    token: 'https://streamlabs.com/api/v1.0/token',
    socketToken: 'https://streamlabs.com/api/v1.0/socket/token',
    socket: 'https://sockets.streamlabs.com',
    alert: 'https://streamlabs.com/api/v1.0/alerts',
  }

  constructor(private configService: ConfigService, private settingsService: SettingsService) { }

  // This function fetches tokens from Streamlabs API and updates the settings
  private async fetchTokensWithData(data: string) {
    const redirectUri = this.configService.get('REDIRECT_URI') + '/streamlabs/authorize';
    const dataPrefix = `client_id=${this.settings.clientId}&client_secret=${this.settings.clientSecret}&redirect_uri=${redirectUri}&`;
    try {
      const response = await axios.post(this.urls.token, dataPrefix + data);
      const tokenData = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn:  new Date().getTime() + (response.data.expires_in * 1000)
      };
      this.settings.tokens = tokenData;
      await this.settingsService.update(STREAMLABS_MODULE, this.settings);
      this.logger.log('Updated Streamlabs tokens');
    } catch (e) {
      this.logger.error("Error while refreshing Streamlabs token", e)
      this.logger.error(e.response.data)
    }
  }

  async getFreshTokens(code: string) {
    this.logger.log("Fetching fresh Streamlabs tokens");
    const data = `grant_type=authorization_code&code=${code}`;
    await this.fetchTokensWithData(data);
  }

  async refreshTokensIfNeeded(): Promise<number> {
    const timeOffset = 10 * 1000;
    const data = `grant_type=refresh_token&refresh_token=${this.settings.tokens.refreshToken}`;
    if (this.settings.tokens.expiresIn - timeOffset < new Date().getTime()) {
      this.logger.log("Refreshing Streamlabs token");
      await this.fetchTokensWithData(data);
    }
    return this.settings.tokens.expiresIn - new Date().getTime() - timeOffset;
  }

  async tokenAutoRefresh() {
    let nextRefresh = await this.refreshTokensIfNeeded(); 
    if (nextRefresh < 0) nextRefresh = 5000;
    this.logger.log("Next token update in " + Math.round(nextRefresh / 1000) + " seconds")
    setTimeout(this.tokenAutoRefresh.bind(this), nextRefresh);
  }

  async getSocketToken() {
    const socketTokenResponse = await axios.get(this.urls.socketToken + '?access_token=' + this.settings.tokens.accessToken);
    return socketTokenResponse.data.socket_token;
  }

  async connect() {
    const token = await this.getSocketToken();
    this.socket = io(this.urls.socket + '?token=' + token, {transports: ['websocket']})
  }

  async init(channelId: string) {
    this.channelId = channelId;

    try {
      this.settings = await this.settingsService.get(STREAMLABS_MODULE) as StreamlabsSettings;
    } catch (e) {
      this.logger.error(`Failed to fetch Twtich settings: ${e}`);
      return;
    }

    if (!this.settings.tokens?.refreshToken) {
      this.logger.error(`Refresh token missing in Twitch settings!`);
      return;
    }

    await this.tokenAutoRefresh();
    this.logger.log('Initialization complete!');
  }

  async onDonation(listener: (message: any) => void) {
    const handler = eventData => {
      if (eventData.type === 'donation') {
        eventData.message.forEach(async (message) => {
          listener(message);
        })
      }
    };
    this.socket.on('event', handler);
    return () => {
      this.socket.off('event', handler);
    }
  }

  async sendSoundAlert(soundUrl: string, duration: number) {
    const transparentGifUrl = 'https://sjwp.pl/48live/transparent.gif';
    const data = `access_token=${this.settings.tokens.accessToken}&type=donation&message=%20&duration=${duration}&image_href=${transparentGifUrl}&sound_href=${soundUrl}`;
    await axios.post(this.urls.alert, data)
  }

  async sendAlert(message: string, userMessage: string, imageUrl: string, soundUrl: string, duration: number) {
    const data = `access_token=${this.settings.tokens.accessToken}&type=donation&message=${message}&user_message=${userMessage}&duration=${duration}&image_href=${imageUrl}&sound_href=${soundUrl}`;
    await axios.post(this.urls.alert, data)
  }
}