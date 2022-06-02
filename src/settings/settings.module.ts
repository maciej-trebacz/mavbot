import { Module } from "@nestjs/common";
import { DbModule } from "src/db";
import { SettingsService } from "./settings.service";

@Module({
  imports: [DbModule],
  providers: [SettingsService],
  exports: [SettingsService]
})
export class SettingsModule {}