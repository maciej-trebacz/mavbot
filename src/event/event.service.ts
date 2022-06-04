import { Injectable, Logger } from '@nestjs/common';
import { DbService } from "src/db";
import { TwitchService } from 'src/twitch';
import { ChatUser } from '@twurple/chat/lib';
import { Listener } from '@d-fischer/typed-event-emitter/lib';

type TriggerOrActionFn = (this: {
  dbService: DbService, 
  twitchService: TwitchService, 
  channelId: string,
  logger: Logger,
}, ...args: any[]) => void;

interface EventListenerMap {
  [key: string]: Listener[];
}

interface EventActionOrTrigger {
  type: string;
  params: any[];
}

interface Event {
  name: string;
  triggers: EventActionOrTrigger[];
  actions: EventActionOrTrigger[];
  modOnly?: boolean;
  broadcasterOnly?: boolean;
  subscriberOnly?: boolean;
}

interface TriggerOrActionFnsMap {
  [key: string]: TriggerOrActionFn;
}

/* Map of available ACTION functions */
const actionFns: TriggerOrActionFnsMap = {
  async random_number({min = 0, max}) {
    return {
      randomNumber: Math.ceil(parseInt(min) + Math.random() * parseInt(max) - parseInt(min))
    }
  },
  async chat_say({text}) {
    this.twitchService.sendChatMessage(text);
  },
  async fetch_value({key}) {
    const docs = await this.dbService.find(`channels/${this.channelId}/data`, `key == ${key}`)
    if (docs && docs.length > 0) {
      this.logger.log(`Found value for key '${key}': '${docs[0].value}'`)
      return {
        value: docs[0].value
      }
    } else {
      this.logger.warn(`Key '${key}' not found while trying to fetch data`)
      return {}
    }
  },
  async store_value({key, value}) {
    const docPrefix = `channels/${this.channelId}/data`;
    const docs = await this.dbService.find(docPrefix, `key == ${key}`)
    if (docs && docs.length > 0) {
      await this.dbService.update(`${docPrefix}/${docs[0]._id}`, {value})
    } else {
      await this.dbService.insert(docPrefix, {key, value})
    }
  }

  // Variable parsing - add math functions, reading subfields:
  // {var + 1}
  // {var * 2}
  // {var - var2}
  // {var.field}
  // Use Math.js for that
}

/* Map of available TRIGGER functions */
const triggerFns: TriggerOrActionFnsMap = {
  chat_message({match, modOnly}, callback: (args: any) => void) {
    return this.twitchService.onChatMessage((_, __, message, msg) => {
      const regexp = new RegExp(match);
      if (regexp.test(message)) {
        if (modOnly && !(msg.userInfo.isMod || msg.userInfo.isBroadcaster)) {
          this.twitchService.sendChatMessage("Sorry, you're not authorized to use this command!");
          return;
        }
        const matches = regexp.exec(message);
        const messageParams = matches.slice(1);
        callback({user: msg.userInfo.displayName, message, messageParams})
      }
    })
  }
  // TODO: bits, donations, subs, point rewards, hype train
}

@Injectable()
export class EventService {
  private channelId: string;
  private readonly logger = new Logger(EventService.name);
  private dbListener: () => void;
  private eventListeners: EventListenerMap = {};

  constructor(private dbService: DbService, private twitchService: TwitchService) {}

  async init(channelId: string) {
    this.channelId = channelId;

    this.dbListener = this.dbService.subscribeCollection(`channels/${channelId}/events`, snapshot => {
      snapshot.docChanges().forEach(doc => {
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
          this.subscribe(doc.doc.id, event);
        }
      })
    });
  }

  subscribe(id: string, event: Event) {
    this.eventListeners[id] = [];
    this.logger.log("Subscribing to event: " + event.name);

    // Check if any trigger is fired
    event.triggers.forEach(async trigger => {
      if (triggerFns[trigger.type]) {

        // Create a context for variables local to this trigger and populate it with event options and populate it with event options
        const context = {};
        const triggerOptions = Object.assign({}, trigger);
        const {modOnly, broadcasterOnly, subscriberOnly} = event;
        Object.assign(triggerOptions, {modOnly, broadcasterOnly, subscriberOnly})

        const listener = await triggerFns[trigger.type].call(this, triggerOptions, (args: any) => {
          this.logger.log(`Event [${event.name}] triggered by ${JSON.stringify(trigger)} with args: ${JSON.stringify(args)}`);

          // Store variables from the trigger in the context
          Object.assign(context, args);
          event.actions.forEach(async action => {
            const returnArgs = await this.parseAction(action, context);

            // Store action results in the context
            if (returnArgs && typeof returnArgs === 'object') {
              Object.assign(context, returnArgs);
            }
          })
        });
        this.eventListeners[id].push(listener);
      }
    })
  }

  async parseAction(action: EventActionOrTrigger, context) {
    this.logger.log(`Parsing action: ${JSON.stringify(action)}`);
    const actionOptions = Object.assign({}, action);
    delete actionOptions.type;

    for (let field in actionOptions) {
      // Only try to parse the action parameter if it's a string
      if (typeof actionOptions[field] !== 'string') continue;

      // Variable substitution in action parameters
      for (let variable in context) {
        const arrayRegexp = new RegExp(`{${variable}\.(\\d+)}`);
        if (actionOptions[field].indexOf(`{${variable}}`) >= 0) {

          // Simple variable substitution (eg. {variable})
          let value = context[variable];
          if (typeof value === 'object' && value.length > 0) value = value.join(' ');
          actionOptions[field] = actionOptions[field].replace(`{${variable}}`, context[variable])
        } else if (arrayRegexp.test(actionOptions[field])) {

          // Substitution for array elements (eg. {variable.2})
          const index = arrayRegexp.exec(actionOptions[field])[1];
          actionOptions[field] = actionOptions[field].replace(`{${variable}.${index}}`, context[variable][index])
        }
      }
    }
    this.logger.log(`Executing action: ${JSON.stringify(actionOptions)}`);
    return await actionFns[action.type].call(this, actionOptions);
  }
}