import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from "@nestjs/config";
import { EventService } from './event.service';
import { DbModule } from 'src/db';
import { TwitchModule } from 'src/twitch';
import { actionFns } from './actions';

jest.mock('./actions', () => ({
  actionFns: {
    async test_action({ field }) {
      return {
        field
      }
    }
  }
}));

describe('EventService', () => {
  let eventService: EventService;

  beforeAll(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, DbModule, TwitchModule],
      providers: [EventService],
    }).compile();

    eventService = app.get<EventService>(EventService);
  });

  it('can parse variables', async () => {
    const context = {
      var: 'hello',
      var2: 2,
      messageParams: ['world'],
      obj: {
        key: 'val'
      },
    };
    expect(eventService.parseVariables('var', context)).toBe('hello');
    expect(eventService.parseVariables('var2 + 2', context)).toBe('2 + 2');
    expect(eventService.parseVariables('hello messageParams.0', context)).toBe('hello world');
    expect(eventService.parseVariables('test obj.key test2', context)).toBe('test val test2');
  })

  it('can parse field value', async () => {
    const context = {
      value: 2,
      var: 'test',
      tag: '#ff7',
      messageParams: ['4'],
      obj: {
        key: '3'
      },
    };
    expect(eventService.parseFieldValue('{{1 + 2}}', context)).toBe('3');
    expect(eventService.parseFieldValue('2 + 2 = {{value + 2}}', context)).toBe('2 + 2 = 4');
    expect(eventService.parseFieldValue('this is a {var} with some math: {{1 + value * 3}}', context)).toBe('this is a test with some math: 7');
    expect(eventService.parseFieldValue('{{messageParams.0 * obj.key}}', context)).toBe('12');
    expect(eventService.parseFieldValue('{var} voted for {tag} and it has now {{value + 1}} votes', context)).toBe('test voted for #ff7 and it has now 3 votes');
  })

  it('can parse actions', async () => {
    const context = {};
    const action = {
      type: 'test_action',
      field: 'test_value'
    };
    expect(await eventService.parseAction(action, context)).toEqual({ field: action.field });
  });
});
