import { Module } from "@nestjs/common";
import { DbModule } from "src/db";
import { PeopleService } from "./people.service";
import { TwitchModule } from "src/twitch";

@Module({
  imports: [DbModule, TwitchModule],
  providers: [PeopleService],
  exports: [PeopleService]
})
export class PeopleModule {}