import { Test } from '@nestjs/testing';
import { ChatGPTService } from './chatgpt.service';
import { ConfigModule } from "@nestjs/config";

// Setup dotenv
import * as dotenv from 'dotenv';
import { CustomLogger } from 'src/logger';
dotenv.config();

describe('ChatGptService', () => {
  let service: ChatGPTService;

  beforeEach(async () => {
    const module = Test.createTestingModule({
      imports: [ConfigModule],
      providers: [ChatGPTService],
    })
    module.setLogger(new CustomLogger());
    const compiled = await module.compile();
    service = compiled.get(ChatGPTService);
  });

  it('should respond with correct name', async () => {
    const res = await service.sendMessage('Hello there, what is your name?', 'test1')
    expect(res).toContain('Yuffie')
  });
})