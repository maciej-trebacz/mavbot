import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SettingsModule } from 'src/settings/settings.module';
import { TwitchController } from './twitch.controller';
import { TwitchService } from "./twitch.service";

@Module({
  imports: [SettingsModule, ConfigModule],
  controllers: [TwitchController],
  providers: [TwitchService],
  exports: [TwitchService]
})
export class TwitchModule {}