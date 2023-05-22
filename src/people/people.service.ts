import { Injectable, Logger } from '@nestjs/common';
import { DbService } from "src/db";
import { Timestamp, QueryDocumentSnapshot, DocumentData } from '@google-cloud/firestore';
import { TwitchService } from 'src/twitch';

interface Person {
  displayName: string;
  lastSeen: Date;
}

@Injectable()
export class PeopleService {
  private settings: any;
  private channelId: string;
  private readonly logger = new Logger(PeopleService.name);
  private people: Record<string, Person> = {};

  constructor(private dbService: DbService, private twitchService: TwitchService) {}

  async init(channelId: string) {
    this.channelId = channelId;
    // Subscribe to the people collection in the db and listen for changes and store these changes in a local cache 
    this.logger.log(`Subscribing to people collection for channel ${channelId}...`);
    this.dbService.subscribeCollection(`channels/${channelId}/people`, (people) => {
      this.logger.debug(`Received people collection update for channel ${channelId}`);
      const newPeople = {}
      people.forEach((snapshot: QueryDocumentSnapshot) => {
        const data = snapshot.data() as DocumentData;
        newPeople[snapshot.id] = {
          ...data,
          lastSeen: (data.lastSeen as Timestamp).toDate(),
        } as Person;
      });
      this.people = newPeople;
    });

    this.setupListener();
  }

  setupListener() {
    // Update person's last seen time and display name in the database after each message
    return this.twitchService.onChatMessage((_, __, message, msg) => {
      // Delay the update to make sure all triggers still get the previous person data
      setTimeout(async () => await this.update(msg.userInfo.userId, { 
        lastSeen: new Date(),
        displayName: msg.userInfo.displayName,
      }), 100)
    });
  }

  async update(id: string, person: Person) {
    await this.dbService.set(`channels/${this.channelId}/people/${id}`, person);
  }

  get(id: string): Person {
    return this.people[id];
  }
}