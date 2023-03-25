import { TriggerOrActionFnsMap } from "./event.service";

export const actionFns: TriggerOrActionFnsMap = {
  async random_number({ min = 0, max }) {
    return {
      randomNumber: Math.ceil(parseInt(min) + Math.random() * parseInt(max) - parseInt(min))
    }
  },
  async chat_say({ text }) {
    this.twitchService.sendChatMessage(text);
  },
  async fetch_value({ key, defaultValue }) {
    const docs = await this.dbService.find(`channels/${this.channelId}/data`, `key == ${key}`)
    if (docs && docs.length > 0) {
      this.logger.log(`Found value for key '${key}': '${docs[0].value}'`)
      return {
        value: docs[0].value
      }
    } else {
      this.logger.log(`Key '${key}' not found, returning default value: '${defaultValue}'`)
      return {
        value: defaultValue
      }
    }
  },
  async store_value({ key, value }) {
    if (!key) throw Error(`Field 'key' is missing for action store_value!`);
    const docPrefix = `channels/${this.channelId}/data`;
    const docs = await this.dbService.find(docPrefix, `key == ${key}`)
    if (docs && docs.length > 0) {
      await this.dbService.update(`${docPrefix}/${docs[0]._id}`, { value })
    } else {
      await this.dbService.insert(docPrefix, { key, value })
    }
    return {
      value
    }
  },
  async ai_response({prompt, user}) {
    const message = prompt as string
    const response = await this.chatGPTService.sendMessage(user + ": " + message, user)
    this.twitchService.sendChatMessage(response);
  }
}