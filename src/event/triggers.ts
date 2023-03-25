import { TriggerOrActionFnsMap } from "./event.service";

// FIXME: This set should be cleared at the beginning of each stream
const messageAuthors = new Set<string>();
messageAuthors.add('m4v3k')
messageAuthors.add('yettenigma')
messageAuthors.add('mushroomsuprise')
messageAuthors.add('tendyourowngrave')

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
        callback({ user: msg.userInfo.displayName, message, messageParams })
      }
    })
  },
  first_chat({ modOnly }, callback: (args: any) => void) {
    return this.twitchService.onChatMessage((_, __, message, msg) => {
      if (modOnly && !(msg.userInfo.isMod || msg.userInfo.isBroadcaster)) {
        return;
      }
      const displayNameLowercase = msg.userInfo.displayName.toLocaleLowerCase();
      if (messageAuthors.has(displayNameLowercase)) {
        return;
      }
      messageAuthors.add(displayNameLowercase);
      callback({ user: msg.userInfo.displayName, message })
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
        callback({ user: msg.userInfo.displayName, message })
      }
    })
  },
}