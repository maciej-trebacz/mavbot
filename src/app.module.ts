import { Module, Logger } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BotModule, BotService } from './bot';
import { SettingsModule } from './settings';

@Module({
  imports: [ConfigModule.forRoot(), BotModule, SettingsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);

  constructor(private configService: ConfigService, private botService: BotService) {
    const channelId = configService.get<string>('CHANNEL_ID');
    if (!channelId) throw new Error('No CHANNEL_ID supplied in the .env file!');

    this.logger.log('Initializing Bot service');
    botService.init(channelId);
  }
}
