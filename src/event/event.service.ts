import { Injectable, Logger } from '@nestjs/common';
import { DbService } from "src/db";
import { TwitchService } from 'src/twitch';
import { ChatUser } from '@twurple/chat/lib';
import { Listener } from '@d-fischer/typed-event-emitter/lib';

type TriggerOrActionFn = (this: {dbService: DbService, twitchService: TwitchService}, ...args: any[]) => void;

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
}

interface TriggerOrActionFnsMap {
  [key: string]: TriggerOrActionFn;
}

/* Map of available ACTION functions */
const actionFns: TriggerOrActionFnsMap = {
  random_number({min = 0, max}) {
    return {
      randomNumber: Math.ceil(parseInt(min) + Math.random() * parseInt(max) - parseInt(min))
    }
  },
  chat_say({text}) {
    this.twitchService.sendChatMessage(text);
  }
  // TODO: alerts, set_variable, store_value
}

/* Map of available TRIGGER functions */
const triggerFns: TriggerOrActionFnsMap = {
  chat_message({match}, callback: (args: any) => void) {
    return this.twitchService.onChatMessage((_, __, message, msg) => {
      const regexp = new RegExp(match);
      if (regexp.test(message)) {
        const matches = regexp.exec(message);
        const messageParams = matches.slice(1);
        callback({user: msg.userInfo.displayName, message, messageParams})
      }
    })
  }
  // TODO: bits, donations, subs, point rewards
}

@Injectable()
export class EventService {
  private channelId: string;
  private readonly logger = new Logger(EventService.name);
  private dbListener: () => void;
  private eventListeners: EventListenerMap = {};

  constructor(private dbService: DbService, private twitchService: TwitchService) {}

  async init(channelId: string) {
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

        // Create a context for variables local to this trigger
        const context = {};
        const listener = await triggerFns[trigger.type].call(this, trigger, (args: any) => {
          this.logger.log(`Event [${event.name}] triggered by ${JSON.stringify(trigger)} with args: ${JSON.stringify(args)}`);

          // Store variables from the trigger in the context
          Object.assign(context, args);
          event.actions.forEach(action => {
            const returnArgs = this.parseAction(action, context);

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

  parseAction(action: EventActionOrTrigger, context) {
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
    return actionFns[action.type].call(this, actionOptions);
  }
}