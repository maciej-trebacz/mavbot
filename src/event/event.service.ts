import { Injectable, Logger } from '@nestjs/common';
import { DbService } from "src/db";
import { TwitchService } from 'src/twitch';
import { ChatGPTService } from 'src/chatgpt';
import { PeopleService } from 'src/people';
import { Listener } from '@d-fischer/typed-event-emitter/lib';
import { triggerFns } from './triggers';
import { actionFns } from './actions';
import { evaluate } from 'mathjs';

type TriggerOrActionFn = (this: {
  dbService: DbService,
  twitchService: TwitchService,
  chatGPTService: ChatGPTService,
  peopleService: PeopleService,
  channelId: string,
  logger: Logger,
}, args: any, context: any) => void;

export interface TriggerOrActionFnsMap {
  [key: string]: TriggerOrActionFn;
}

interface EventListenerMap {
  [key: string]: Listener[];
}

interface EventActionOrTrigger {
  type: string;
  [key: string]: any;
}

interface Event {
  name: string;
  triggers: EventActionOrTrigger[];
  actions: EventActionOrTrigger[];
  modOnly?: boolean;
  broadcasterOnly?: boolean;
  subscriberOnly?: boolean;
}

@Injectable()
export class EventService {
  private channelId: string;
  private readonly logger = new Logger(EventService.name);
  private dbListener: () => void;
  private eventListeners: EventListenerMap = {};

  constructor(private dbService: DbService, private twitchService: TwitchService, private chatGPTService: ChatGPTService, private peopleService: PeopleService ) { }

  async init(channelId: string) {
    this.channelId = channelId;

    this.dbListener = this.dbService.subscribeCollection(`channels/${channelId}/events`, async snapshot => {
      for (const doc of snapshot.docChanges()) {
        const event = doc.doc.data() as Event;

        // Unsubscribe from all active listeners for this event
        if (doc.type === 'modified' || doc.type === 'removed') {
          if (this.eventListeners[doc.doc.id]) {
            this.eventListeners[doc.doc.id].forEach(listener => {
              if (typeof listener.unbind === 'function') listener.unbind();
              else if (typeof listener === 'function') (listener as () => void)();
            });
            delete this.eventListeners[doc.doc.id];
          }
        }

        // Create new listeners for this event
        if (doc.type === 'added' || doc.type === 'modified') {
          await this.subscribe(doc.doc.id, event);
        }
      }
    });
  }

  async subscribe(id: string, event: Event) {
    this.eventListeners[id] = [];
    this.logger.log("Subscribing to event: " + event.name);

    // Check if any trigger is fired
    for (const trigger of event.triggers) {
      if (triggerFns[trigger.type]) {

        // Create a context for variables local to this trigger and populate it with event options and populate it with event options
        const context = {};
        // FIXME: the trigger contains previously declared variables?
        const triggerOptions = Object.assign({}, trigger);
        const { modOnly, broadcasterOnly, subscriberOnly } = event;
        Object.assign(triggerOptions, { modOnly, broadcasterOnly, subscriberOnly })

        const listener = await triggerFns[trigger.type].call(this, triggerOptions, async (args: any) => {
          this.logger.log(`Event [${event.name}] triggered by ${JSON.stringify(trigger)} with args: ${JSON.stringify(args)}`);

          // Store variables from the trigger in the context
          Object.assign(context, args);
          for (const action of event.actions) {
            const returnArgs = await this.parseAction(action, context, event.name);
            if (returnArgs === false) break;

            // Store action results in the context
            if (returnArgs && typeof returnArgs === 'object') {
              Object.assign(context, returnArgs);
            }
          }
        });
        this.eventListeners[id].push(listener);
      }
    }
  }

  // Parses a single variable/array item/object field and returns its value
  parseTokenMatch(match: RegExpMatchArray, context) {
    if (typeof context[match[1]] === 'undefined') return match[0];
    if (typeof match[2] === 'undefined') {
      // Simple value
      return context[match[1]];
    } else {
      // Array or object
      return context[match[1]][match[2]];
    }
  }

  // Parse variable names in an expression
  parseVariables(input: string, context) {
    const tokenRegex = /\b([a-z]\w*)(?:\.([\w]+))?\b/gi;
    let resultValue = '';
    let pos = 0;

    for (const match of input.matchAll(tokenRegex)) {
      resultValue += input.substring(pos, match.index) + this.parseTokenMatch(match, context);
      pos = match.index + match[0].length;
    }

    if (pos < input.length) {
      resultValue += input.substring(pos);
    }

    return resultValue;
  }

  // Parse strings with variables and expressions
  parseFieldValue(fieldValue: string, context) {
    const varRegex = /{{?\b([^}]+)\b[^}]*?}}?/g;
    let resultValue = '';
    let pos = 0;

    for (const match of fieldValue.matchAll(varRegex)) {
      let substitution = this.parseVariables(match[1], context);
      if (match[0].indexOf('{{') === 0) substitution = evaluate(substitution);
      resultValue += fieldValue.substring(pos, match.index) + substitution;
      pos = match.index + match[0].length;
    }

    if (pos < fieldValue.length) {
      resultValue += fieldValue.substring(pos);
    }

    return resultValue;
  }

  async parseAction(action: EventActionOrTrigger, context: any, eventName: string) {
    this.logger.log(`Event [${eventName}] parsing action: ${JSON.stringify(action)}`);
    const actionOptions = Object.assign({}, action);
    delete actionOptions.type;

    for (const field in actionOptions) {
      // Only try to parse the action parameter if it's a string
      if (typeof actionOptions[field] !== 'string') continue;

      // Variable substitution in action parameters
      actionOptions[field] = this.parseFieldValue(actionOptions[field], context)
    }
    this.logger.log(`Event [${eventName}] Executing action with options: ${JSON.stringify(actionOptions)} and context: ${JSON.stringify(context)}`);
    if (!actionFns[action.type]) {
      this.logger.error(`Event [${eventName}] Action '${action.type}' does not exist, skipping...`)
      return;
    }

    try {
      return await actionFns[action.type].call(this, actionOptions, context);
    } catch (e) {
      this.logger.error(`Event [${eventName}] Error while executing action '${action.type}': ${e.message}`)
      return false
    }
  }
}