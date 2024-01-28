import { formatDistance } from 'date-fns'
import { TriggerOrActionFnsMap } from "./event.service";

// Note: This could be rearchitected so that triggers define which listeners they need, and then the event service
// subscribes only once to each listener and executes all triggers that depend on that listener.
// This way we could for example stop processing listeners once a trigger has been found.
// So for example if a first_chat was triggered we don't also trigger a mention or chat_message and send two messages.
export const triggerFns: TriggerOrActionFnsMap = {
  chat_message({ match, modOnly }, callback: (args: any) => void) {
    return this.twitchService.onChatMessage((_, __, message, msg) => {
      const regexp = new RegExp(match);
      if (regexp.test(message)) {
        if (modOnly && !(msg.userInfo.isMod || msg.userInfo.isBroadcaster)) {
          this.twitchService.sendChatMessage("Sorry, you're not authorized to use this command!");
          return;
        }
        const matches = regexp.exec(message);
        const messageParams = matches.slice(1);
        callback({ user: msg.userInfo.displayName, userId: msg.userInfo.userId, message, messageParams, msg })
      }
    })
  },
  first_chat({ modOnly }, callback: (args: any) => void) {
    return this.twitchService.onChatMessage((_, __, message, msg) => {
      let firstChat = false;
      const maxInactiveTime = 1000 * 60 * 240; // 4 hours
      const person = this.peopleService.get(msg.userInfo.userId)
      const lastSeen = person?.lastSeen || new Date();
      const lastSeenRelative = person?.lastSeen ? formatDistance(person.lastSeen, new Date(), {addSuffix: true}) : "never";
      if (!person || new Date().getTime() - person.lastSeen.getTime() > maxInactiveTime ) firstChat = true;

      if (!firstChat || (modOnly && !(msg.userInfo.isMod || msg.userInfo.isBroadcaster))) {
        return;
      }
      callback({ user: msg.userInfo.displayName, userId: msg.userInfo.userId, message, msg, lastSeen, lastSeenRelative })
    })
  },  
  mention({ modOnly }, callback: (args: any) => void) {
    return this.twitchService.onChatMessage((_, __, message, msg) => {
      const regexp = /^@yufibot / // FIXME: Pass bot's username here
      if (regexp.test(message)) {
        if (modOnly && !(msg.userInfo.isMod || msg.userInfo.isBroadcaster)) {
          this.twitchService.sendChatMessage("Sorry, you're not authorized to use this command!");
          return;
        }
        callback({ user: msg.userInfo.displayName, userId: msg.userInfo.userId, message, msg })
      }
    })
  },
}