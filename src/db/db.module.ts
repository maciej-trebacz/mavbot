import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DbService } from "./db.service";

@Module({
  imports: [ConfigModule],
  providers: [DbService],
  exports: [DbService]
})
export class DbModule {}