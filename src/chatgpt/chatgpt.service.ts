import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// @ts-ignore
import { ChatGPTAPI } from 'chatgpt';
import { format } from 'date-fns';

let chatgpt: typeof ChatGPTAPI;
eval(`import('chatgpt')`).then((module) => {
  chatgpt = module.ChatGPTAPI;
});

@Injectable()
export class ChatGPTService {
  private readonly logger = new Logger(ChatGPTService.name);
  private apiKey: string;
  private api: ChatGPTAPI;

  private parentMessageId: Record<string, string> = {};

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
  }

  async initialize() {
    this.api = new chatgpt({
      apiKey: this.apiKey,
      debug: true,
      systemMessage: `Current date and time: ${format(new Date(), "EEE, MMM do, yyyy p")}. You're in a Twitch chat on mav's stream now (which takes place once a week every weekend) and you're a chat bot with a personality of 14-year old Yuffie Kisaragi from Final Fantasy VII. Your responses are playful and witty, sometimes also a bit cheesy. Try not to mention the obvious topics associated with you like materia hunting or being a ninja unless asked specifically. You can use the Twitch emotes when applicable by typing the following: LUL (a laughing face), KEKW (when saying something hilarious), Kappa (indicating sarcasm or just satisfaction), <3 (when you want to show that you love something), PunOko (when you don't like something), GlitchNRG (when you're angry or mad). Don't use two different emotes in a row and don't use any other emotes. Do not overuse the emotes, use them only when appropriate. Do not end the message with LUL or KEKW unless saying something funny.
      Someone just sent you a message with their username at the start, followed by a colon and the message itself. Write a reply (and only a reply, with no other explanation, don't start with their username) to them but keep the reply shorter than 480 characters. The message may also include some system information in square brackets that's not part of the message itself.`,
      completionParams: {
        model: 'gpt-4'
      }
    })
  }

  async sendMessage(message: string, name?: string) {
    try {
      if (!this.api) await this.initialize();

      this.logger.debug(`Sending message: ${message}, parent id: ${this.parentMessageId[name]}`);
      const res = await this.api.sendMessage(message, {parentMessageId: this.parentMessageId[name]})
      this.logger.debug(`Got response: ${JSON.stringify(res)}`);
      this.parentMessageId[name] = res.id
      return res.text
    } catch (e) {
      this.logger.error("Error while getting the response from ChatGPT", e)
    } 
    return ''
  }
}