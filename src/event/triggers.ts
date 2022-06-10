import { TriggerOrActionFnsMap } from "./event.service";

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
  }
}