import { Injectable, Logger } from '@nestjs/common';
import { DbService } from "src/db";

@Injectable()
export class PsnService {
  private settings: any;
  private channelId: string;
  private readonly logger = new Logger(PsnService.name);

  constructor(private dbService: DbService) {}
}