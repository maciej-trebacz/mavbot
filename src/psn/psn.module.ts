import { Module } from "@nestjs/common";
import { DbModule } from "src/db";
import { PsnService } from "./psn.service";

@Module({
  imports: [DbModule],
  providers: [PsnService],
  exports: [PsnService]
})
export class PsnModule {}