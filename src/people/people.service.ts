import { Injectable, Logger } from '@nestjs/common';
import { DbService } from "src/db";
import { Timestamp, QueryDocumentSnapshot, DocumentData } from '@google-cloud/firestore';
import { TwitchService } from 'src/twitch';

export interface Person {
  displayName: string;
  lastSeen: Date;
  summary?: string;
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
      setTimeout(async () => {
        await this.update(msg.userInfo.userId, { 
          lastSeen: new Date(),
          displayName: msg.userInfo.displayName,
        }, !!this.people[msg.userInfo.userId])
      }, 100)
    });
  }

  async update(id: string, person: Partial<Person>, isExisting = true) {
    if (isExisting) {
      await this.dbService.update(`channels/${this.channelId}/people/${id}`, person);
    } else {
      await this.dbService.set(`channels/${this.channelId}/people/${id}`, person);
    }
    this.people[id] = { ...this.people[id], ...person };
  }

  get(id: string): Person {
    return this.people[id];
  }

  async set(id: string, key: string, value: any) {
    this.people[id][key] = value;
    await this.dbService.update(`channels/${this.channelId}/people/${id}`, { [key]: value });
  }
}