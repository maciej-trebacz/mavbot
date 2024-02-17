import { Module } from "@nestjs/common";
import { DbModule } from "src/db";
import { PsnService } from "./psn.service";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [DbModule, ConfigModule],
  providers: [PsnService],
  exports: [PsnService]
})
export class PsnModule {}