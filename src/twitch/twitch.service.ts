import { Injectable, Logger } from '@nestjs/common';
import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient, HelixUser } from '@twurple/api';
import { ChatClient } from '@twurple/chat';
import { PubSubBitsMessage, PubSubClient, PubSubListener, PubSubRedemptionMessage, PubSubSubscriptionMessage } from '@twurple/pubsub';
import { SettingsService } from 'src/settings';
import { TwitchPrivateMessage } from '@twurple/chat/lib/commands/TwitchPrivateMessage';
import { Listener } from '@d-fischer/typed-event-emitter/lib';

interface TwitchTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  obtainmentTimestamp: number;
}

export interface TwitchSettings {
  clientId: string;
  clientSecret: string;
  apiTokens: TwitchTokens;
  chatTokens: TwitchTokens;
}

interface TwitchListeners {
  chat?: Listener;
  subscribe?: PubSubListener;
  bits?: PubSubListener;
  pointReward?: PubSubListener;
}

export const TWITCH_MODULE = 'twitch';

@Injectable()
export class TwitchService {
  private readonly logger = new Logger(TwitchService.name);
  private channelId: string;
  private user: HelixUser;
  private settings: TwitchSettings;
  private listeners: TwitchListeners = {};

  private apiClient: ApiClient;
  private pubSubClient: PubSubClient;
  private chatClient: ChatClient;

  constructor(private settingsService: SettingsService) { }

  private getAuthProvider(tokens: TwitchTokens) {
    return new RefreshingAuthProvider(
      {
        clientId: this.settings.clientId,
        clientSecret: this.settings.clientSecret,
        onRefresh: async newTokenData => {
          Object.assign(tokens, newTokenData);
          this.settingsService.update(TWITCH_MODULE, this.settings);
        }
      },
      tokens
    );
  }

  async init(channelId: string) {
    this.channelId = channelId;

    try {
      this.settings = await this.settingsService.get(TWITCH_MODULE);
    } catch (e) {
      this.logger.error(`Failed to fetch Twtich settings: ${e}`);
      return;
    }

    if (!this.settings.apiTokens?.refreshToken) {
      this.logger.error(`Refresh token missing in Twitch settings!`);
      return;
    }

    // We need separate auth providers for both chat interactions and other Twitch API calls
    const apiAuthProvider = this.getAuthProvider(this.settings.apiTokens);
    const chatAuthProvider = this.settings.chatTokens ? this.getAuthProvider(this.settings.chatTokens) : null;
    if (chatAuthProvider) {
      this.logger.log(`Got Chat auth token, using a separate Chat bot account`);
    }

    this.apiClient = new ApiClient({authProvider: apiAuthProvider});
    try {
      this.logger.log(`Connecting to Twitch API`);
      this.user = await this.apiClient.users.getUserByName(this.channelId);
    } catch (e) {
      this.logger.error("Error while connecting to Twitch API: ", e)
      return;
    }
    this.logger.log(`Got broadcaster user ID: ${this.user.id}`);

    this.logger.log(`Connecting to PubSub`);
    this.pubSubClient = new PubSubClient();
    await this.pubSubClient.registerUserListener(apiAuthProvider);

    this.logger.log(`Connecting to Twitch chat`);
    this.chatClient = new ChatClient({authProvider: chatAuthProvider || apiAuthProvider, channels: [channelId]});
    await this.chatClient.connect();

    this.logger.log(`Initialization complete!`);
  }

  async onChatMessage(listener: (channel: string, user: string, message: string, msg: TwitchPrivateMessage) => void) {
    return this.chatClient.onMessage(listener)
  }

  async onSubscribe(listener: (message: PubSubSubscriptionMessage) => void) {
    return this.pubSubClient.onSubscription(this.user.id, listener);
  }

  async onBits(listener: (message: PubSubBitsMessage) => void) {
    return this.pubSubClient.onBits(this.user.id, listener);
  }

  async onPointReward(listener: (message: PubSubRedemptionMessage) => void) {
    return this.pubSubClient.onRedemption(this.user.id, listener);
  }

  async sendChatMessage(text: string) {
    await this.chatClient.say(this.channelId, text);
  }
}