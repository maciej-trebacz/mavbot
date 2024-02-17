import { Test } from '@nestjs/testing';
import { ChatGPTService } from './chatgpt.service';
import { ConfigModule } from "@nestjs/config";
import { ModuleMocker, MockFunctionMetadata } from 'jest-mock';
import { CustomLogger } from 'src/logger';
import { TwitchService } from 'src/twitch';
import { PeopleService } from 'src/people';

// Setup dotenv
import * as dotenv from 'dotenv';
import { Person } from 'src/people/people.service';
dotenv.config();

const moduleMocker = new ModuleMocker(global);

describe('ChatGptService', () => {
  let service: ChatGPTService;
  let messageLog: unknown[] = [];
  let people: Record<string, Person> = {};

  beforeEach(async () => {
    const module = Test.createTestingModule({
      imports: [ConfigModule],
      providers: [ChatGPTService],
    })
    module.setLogger(new CustomLogger());
    module.useMocker(token => {
      if (token === TwitchService) {
        return { getMessages: jest.fn().mockImplementation(() => messageLog)};
      } else if (token === PeopleService) {
        return {
          get: jest.fn().mockImplementation((userId: string) => people[userId]),
          update: jest.fn().mockImplementation((userId: string, person: Person) => people[userId] = { ...people[userId], ...person}),
        }
      }
      if (typeof token === 'function') {
        const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
        const Mock = moduleMocker.generateFromMetadata(mockMetadata);
        return new Mock();
      }
    })
    const compiled = await module.compile();
    service = compiled.get(ChatGPTService);
  });

  it('should respond with correct name', async () => {
    const res = await service.sendMessage('Hello there, what is your name?', 'test1')
    expect(res).toContain('Yuffie')
  });

  it('properly group user messages for summarization', async () => {
    jest.spyOn(service, 'summarizeUserMessages').mockResolvedValue();
    messageLog = [
      { userInfo: { userId: 'test1' }, content: {value: 'Hello there' } },
      { userInfo: { userId: 'test2' }, content: {value: 'Whats up' } },
      { userInfo: { userId: 'test1' }, content: {value: 'I\'m back!' } },
    ]

    await service.summarizeMessages();
    expect(service.summarizeUserMessages).toHaveBeenCalledTimes(2);

    const calls = (service.summarizeUserMessages as jest.Mock).mock.calls;
    expect(calls[0][0]).toBe('test1');
    expect(calls[1][0]).toBe('test2');
    expect(calls[0][1]).toBe('Hello there\nI\'m back!\n');
    expect(calls[1][1]).toBe('Whats up\n');
  });

  it('summarizes corrently when there\'s no content', async () => {
    people = { '123': { displayName: 'test1', lastSeen: new Date() } };
    // jest.spyOn(service, 'postMessages').mockResolvedValue('SUMMARY: <no summary yet>');

    await service.summarizeUserMessages('123', 'yo');
    expect(people['123'].summary).toContain('<no summary yet>');
  });

  it('summarizes corrently when there is some content', async () => {
    people = { '123': { displayName: 'test1', lastSeen: new Date() } };
    await service.summarizeUserMessages('123', 'hey there\ni\'m good, been busy lately working on my train project');
    expect(people['123'].summary).toContain('train');
  });

  it('summarizes corrently when there is an existing summary', async () => {
    people = { '123': { displayName: 'test1', lastSeen: new Date(), summary: "They are going to see the doctor tomorrow. Working on a train project." } };
    await service.summarizeUserMessages('123', 'the visit went fine\nadded another carriage today');
    expect(people['123'].summary).toContain('doctor');
  });    
})