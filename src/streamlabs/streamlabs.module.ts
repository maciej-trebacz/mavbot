import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SettingsModule } from 'src/settings/settings.module';
import { StreamlabsController } from './streamlabs.controller';
import { StreamlabsService } from "./streamlabs.service";

@Module({
  imports: [SettingsModule, ConfigModule],
  controllers: [StreamlabsController],
  providers: [StreamlabsService],
  exports: [StreamlabsService]
})
export class StreamlabsModule {}