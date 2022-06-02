import { Controller, Logger, Get, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from 'src/settings';
import { StreamlabsSettings, StreamlabsService, STREAMLABS_MODULE } from './streamlabs.service';

@Controller('streamlabs')
export class StreamlabsController {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private streamlabsService: StreamlabsService, private settingsService: SettingsService) {
  }
  @Get('/authorize')
  async authorize(@Query() query) {
    try {
      await this.streamlabsService.getFreshTokens(query.code);
      return 'Saved!';
    } catch (e) {
      return 'Error while getting Streamlabs token: ' + (e.response ? e.response.data.error_description : e.message);
    }
  }
}
