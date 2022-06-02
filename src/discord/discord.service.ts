import { Injectable, Logger } from '@nestjs/common';
import { DbService } from "src/db";

@Injectable()
export class DiscordService {
  private settings: any;
  private channelId: string;
  private readonly logger = new Logger(DiscordService.name);

  constructor(private dbService: DbService) {}
}