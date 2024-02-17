import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { format } from 'date-fns';
import OpenAI from 'openai';
import { PeopleService } from 'src/people';
import { TwitchService } from 'src/twitch';

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

  constructor(
    private configService: ConfigService,
    private twitchService: TwitchService,
    private peopleService: PeopleService,
  ) {
    this.api = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async init() {
    const summarizeInterval = 1000 * 60 * 10; // 10 minutes
    setInterval(() => {
      this.summarizeMessages();
    }, summarizeInterval);
    this.logger.log('ChatGPTService initialized');
  }

  getSummarizationPrompt(name: string, summary: string) {
    return `You're a Twitch summarization bot. You will be given a set of messages from a Twitch chat and a previous summary and your goal is to first summarize the input messages, and after that merge the output summary with the previous summary. The resulting summary should not contain any duplicate facts or remarks. The final summary shouls be prefixed with text "SUMMARY:" with no extra text or remarks after it.
    When writing a summary make sure to infer user's interests, personal details, relationships, frequently used memes and chat style from their messages. Skip any irrelevant information that does not add to an accurate portrait of the given user. If the message is short and not relevant to the user's personality, skip it. You are allowed to output an empty summary if no relevant information is found, in this case, the previous summary should be used as the final result. 
    You're now summarizing the messages from ${name}. Previous summary: ${summary}.`;
  }

  async summarizeUserMessages(userId: string, messages: string) {
    const person = this.peopleService.get(userId);
    if (!person) {
      this.logger.error(`Person with id ${userId} not found!`);
      return;
    }

    const previousSummary = person.summary || '<no summary yet>';
    const systemPrompt = this.getSummarizationPrompt(
      person.displayName,
      previousSummary,
    );
    const gptMessages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Input messages:\n${messages}` },
    ];
    const result = await this.postMessages(person.displayName, gptMessages);
    if (result.includes('SUMMARY:')) {
      const summary = result.split('SUMMARY:')[1].trim();
      this.peopleService.update(userId, { summary });
    }
  }

  async summarizeMessages() {
    const messages = await this.twitchService.getMessages();
    const groupedMessages: Record<string, string> = messages.reduce(
      (acc, message) => {
        if (!acc[message.userInfo.userId]) {
          acc[message.userInfo.userId] = '';
        }
        acc[message.userInfo.userId] += message.content.value + '\n';
        return acc;
      },
      {},
    );

    for (const [userId, messages] of Object.entries(groupedMessages)) {
      await this.summarizeUserMessages(userId, messages);
    }
  }

  addSystemMessage(name: string) {
    const systemMessage = `Current date and time: ${format(
      new Date(),
      'EEE, MMM do, yyyy p',
    )}. You're in a Twitch chat on mav's stream now (which takes place once a week every weekend) and you're a chat bot with a personality of 14-year old Yuffie Kisaragi from Final Fantasy VII. Your responses are playful and witty, sometimes also a bit cheesy. Try not to mention the obvious topics associated with you like materia hunting or being a ninja unless asked specifically. You can use the Twitch emotes when applicable by typing the following: LUL (a laughing face), KEKW (when saying something hilarious), Kappa (indicating sarcasm or just satisfaction), <3 (when you want to show that you love something), PunOko (when you don't like something), GlitchNRG (when you're angry or mad). Don't use two different emotes in a row and don't use emojis. Do not overuse the emotes, use them only when appropriate. Do not end the message with LUL or KEKW unless saying something funny.
      Your now talking with ${name}. When writing back write only your reply, with no other explanation, don't start with their username. Keep the reply shorter than 480 characters.`;
    this.addMessage(name, 'system', systemMessage);
  }

  addMessage(name: string, role: MessageRole, message: string) {
    if (!this.sessions[name]) {
      this.sessions[name] = { messages: [], sessionId: undefined };
    }
    this.sessions[name].messages.push({ role, content: message });
  }

  async postMessages(name: string, messages: Message[]) {
    const request: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming =
      {
        model: 'gpt-4-1106-preview',
        messages,
        user: name,
      };
    this.logger.debug(`Sending OpenAI request: ${JSON.stringify(request)}`);
    const data = await this.api.chat.completions.create(request);
    const response = data.choices[0].message.content;
    this.logger.debug(`Got response: ${response}`);
    return response
  }

  async sendMessage(message: string, name: string) {
    try {
      this.logger.debug(`Sending message: ${message}`);

      if (!this.sessions[name]) {
        this.addSystemMessage(name);
      }

      this.addMessage(name, 'user', message);
      const res = await this.postMessages(name, this.sessions[name].messages);
      this.addMessage(name, 'assistant', res);
      return res;
    } catch (e) {
      this.logger.error('Error while getting the response from ChatGPT', e);
    }
    return '';
  }
}
