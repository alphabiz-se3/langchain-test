import { ConversationChain } from 'langchain/chains'
import { ChatOpenAI } from 'langchain/chat_models/openai'

import config from '../config'
import debug from 'debug'
import { BaseMemory, BufferMemory, ChatMessageHistory } from 'langchain/memory'
import { ChatPromptTemplate, SystemMessagePromptTemplate, MessagesPlaceholder, HumanMessagePromptTemplate } from 'langchain/prompts'
import { BaseMessagePromptTemplate } from 'langchain/dist/prompts/chat'
import { ChatHistory } from '../types'
import { SystemMessage } from 'langchain/schema'

const log = debug('lt:openai')

type OpenAIConfig = {
  apiKey: string,
  systemPrompt?: string,
  temperature?: number,
}
export default function createOpenAI (config: OpenAIConfig) {
  log('Create openAI')
  const openAI = new ChatOpenAI({
    openAIApiKey: config.apiKey,
    temperature: config.temperature || 0.8,
  })
  const messages: BaseMessagePromptTemplate[] = []
  if (config.systemPrompt) {
    log('Init with prompt', config.systemPrompt)
    messages.push(SystemMessagePromptTemplate.fromTemplate(config.systemPrompt))
  }
  messages.push(
    new MessagesPlaceholder('history'),
    HumanMessagePromptTemplate.fromTemplate('{question}')
  )
  const prompt = ChatPromptTemplate.fromPromptMessages(messages)
  return function withMemory (memories: ChatHistory[] = []) {
    log(`Create new chat with ${memories.length} history chat`)
    const chatHistory = new ChatMessageHistory()
    for (const mem of memories) {
      switch (mem.type) {
        case 'ai':
          chatHistory.addAIChatMessage(mem.message)
          break
        case 'human':
          chatHistory.addUserMessage(mem.message)
          break
        case 'system':
          chatHistory.addMessage(new SystemMessage(mem.message))
          break
        default:
          const _exhaustiveCheck: never = mem.type // type safe
          return _exhaustiveCheck
      }
    }
    const bufferMemory = new BufferMemory({
      returnMessages: true,
      memoryKey: 'history',
      chatHistory
    })
    const chain = new ConversationChain({
      prompt,
      memory: bufferMemory,
      llm: openAI,
      // verbose: true
    })
    async function ask (question: string) {
      log(`Ask question [${question}]`)
      const result = await chain.call({ question })
      return result.response as string
    }
    async function getHistory (): Promise<ChatHistory[]> {
      const history = await bufferMemory.chatHistory.getMessages()
      const result: ChatHistory[] = []
      for (const h of history) {
        const type = h._getType()
        switch (type) {
          case 'ai':
          case 'human':
          case 'system':
            result.push({ type, message: h.content })
        }
      }
      return result
    }
    return {
      ask,
      getHistory
    }
  }
}
