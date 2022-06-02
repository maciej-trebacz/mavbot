import { Injectable, Logger } from '@nestjs/common';
import { DbService } from "src/db";

@Injectable()
export class SettingsService {
  private settings: any;
  private channelId: string;
  private readonly logger = new Logger(SettingsService.name);

  constructor(private dbService: DbService) {}

  async fetch(channelId: string) {
    this.channelId = channelId;
    this.logger.log(`Fetching bot settings for channel ${channelId}`);
    this.settings = await this.dbService.fetch('settings/' + channelId);
    if (!this.settings) throw new Error(`Got empty settings object from the database`);
    this.logger.log('Got channel settings');
  }

  async get(module: string) {
    if (!this.settings) throw new Error(`[Settings] Got get(${module}) before settings were initialized!`);

    return this.settings[module];
  }

  async update(module: string, obj: any) {
    this.settings = await this.dbService.fetch('settings/' + this.channelId);
    this.settings[module] = obj;
    await this.dbService.update('settings/' + this.channelId, this.settings);
  }
}