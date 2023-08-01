import { ChatOpenAI } from 'langchain/chat_models/openai'
import { BaseMessage, HumanMessage, SystemMessage } from 'langchain/schema'
import axios from 'axios'
import debug from 'debug'

import config from './config'

const log = debug('langchain:test')
axios.defaults.timeout = 15000
if (config.proxy && config.proxy.host) {
  axios.defaults.proxy = config.proxy
}

let OPENAI_API_KEY: string = process.env.OPENAI_API_KEY
if (config.openAI) {
  if (config.openAI.apiKey) OPENAI_API_KEY = config.openAI.apiKey
}
if (typeof OPENAI_API_KEY !== 'string' || !OPENAI_API_KEY) {
  throw new Error('Cannot get OPENAI_API_KEY from enviroment and config.json')
} else {
  log(`Loaded OPENAI_API_KEY "${OPENAI_API_KEY[0]}${'*'.repeat(OPENAI_API_KEY.length - 1)}"`)
}
const openai = new ChatOpenAI({
  openAIApiKey: OPENAI_API_KEY,
  temperature: 0.9,
})

const askSingle = async (question: string) => {
  log(`Ask for question [ ${question} ]`)
  try {
    const messages: BaseMessage[] = []
    if (config.openAI && config.openAI.systemPrompt) {
      messages.push(new SystemMessage(config.openAI.systemPrompt))
    }
    messages.push(new HumanMessage(question))
    const result = await openai.predictMessages(messages);
    // console.log(result)
    return result
  } catch (e) {
    console.warn(`Failed to ask. Error:`, e?.message || e)
    return null
  }
}

export default askSingle
// run("What's your name?")

if (require.main === module) {
  if (!process.argv[2]) {
    console.warn('Pass your question to CLI')
  } else {
    askSingle(process.argv[2]).then(result => {
      if (!result) return console.log('Failed to get result')
      // console.log(`[ChatGPT] ${result}`)
      console.log(result.content)
    })
  }
}
