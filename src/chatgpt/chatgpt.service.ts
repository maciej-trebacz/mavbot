import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { format } from 'date-fns';
import OpenAI from 'openai';

type MessageRole = 'system' | 'user' | 'assistant';

interface Message {
  role: MessageRole;
  content: string;
}

interface Session {
  messages: Message[];
  sessionId: string;
}

@Injectable()
export class ChatGPTService {
  private readonly logger = new Logger(ChatGPTService.name);
  private sessions: Record<string, Session> = {};
  private api: OpenAI;
  private baserunInitialized: boolean;

  constructor(private configService: ConfigService) {
    this.api = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  addSystemMessage(name: string) {
    const systemMessage = `Current date and time: ${format(
      new Date(),
      'EEE, MMM do, yyyy p',
    )}. You're in a Twitch chat on mav's stream now (which takes place once a week every weekend) and you're a chat bot with a personality of 14-year old Yuffie Kisaragi from Final Fantasy VII. Your responses are playful and witty, sometimes also a bit cheesy. Try not to mention the obvious topics associated with you like materia hunting or being a ninja unless asked specifically. You can use the Twitch emotes when applicable by typing the following: LUL (a laughing face), KEKW (when saying something hilarious), Kappa (indicating sarcasm or just satisfaction), <3 (when you want to show that you love something), PunOko (when you don't like something), GlitchNRG (when you're angry or mad). Don't use two different emotes in a row and don't use any other emotes. Do not overuse the emotes, use them only when appropriate. Do not end the message with LUL or KEKW unless saying something funny.
      Someone just sent you a message with their username at the start, followed by a colon and the message itself. Write a reply (and only a reply, with no other explanation, don't start with their username) to them but keep the reply shorter than 480 characters. The message may also include some system information in square brackets that's not part of the message itself.`;
    this.addMessage(name, 'system', systemMessage);
  }

  addMessage(name: string, role: MessageRole, message: string) {
    if (!this.sessions[name]) {
      this.sessions[name] = { messages: [], sessionId: undefined };
    }
    this.sessions[name].messages.push({ role, content: message });
  }

  async postMessages(name: string) {
    const request: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      model: 'gpt-4-1106-preview',
      messages: this.sessions[name].messages,
      user: name,
    };
    this.logger.debug(`Sending OpenAI request: ${JSON.stringify(request)}`);
    const data = await this.api.chat.completions.create(request);
    return data.choices[0].message.content;
  }

  async sendMessage(message: string, name: string) {
    try {
      this.logger.debug(`Sending message: ${message}`);

      if (!this.sessions[name]) {
        this.addSystemMessage(name);
      }

      this.addMessage(name, 'user', message);
      const res = await this.postMessages(name);
      this.addMessage(name, 'assistant', res);
      this.logger.debug(`Got response: ${res}`);
      return res;
    } catch (e) {
      this.logger.error('Error while getting the response from ChatGPT', e);
    }
    return '';
  }
}
