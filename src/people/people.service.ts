import { Injectable, Logger } from '@nestjs/common';
import { DbService } from "src/db";
import { Timestamp, QueryDocumentSnapshot, DocumentData } from '@google-cloud/firestore';

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

  constructor(private dbService: DbService) {}

  async init(channelId: string) {
    this.channelId = channelId;
    // Subscribe to the people collection in the db and listen for changes and store these changes in a local cache 
    this.logger.log(`Subscribing to people collection for channel ${channelId}...`);
    this.dbService.subscribeCollection(`channels/${channelId}/people`, (people) => {
      people.forEach((snapshot: QueryDocumentSnapshot) => {
        const data = snapshot.data() as DocumentData;
        this.people[snapshot.id] = {
          ...data,
          lastSeen: (data.lastSeen as Timestamp).toDate(),
        } as Person;
      });
    });
  }

  async update(id: string, person: Person) {
    await this.dbService.set(`channels/${this.channelId}/people/${id}`, person);
  }

  get(id: string): Person {
    return this.people[id];
  }
}