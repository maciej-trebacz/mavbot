import { Module } from "@nestjs/common";
import { DbModule } from "src/db";
import { PeopleService } from "./people.service";

@Module({
  imports: [DbModule],
  providers: [PeopleService],
  exports: [PeopleService]
})
export class PeopleModule {}