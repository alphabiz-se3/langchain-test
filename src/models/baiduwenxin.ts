import { ConversationChain } from 'langchain/chains'
import { ChatBaiduWenxin } from 'langchain/chat_models/baiduwenxin'

import debug from 'debug'
import { BufferMemory, ChatMessageHistory } from 'langchain/memory'
import { ChatPromptTemplate, SystemMessagePromptTemplate, MessagesPlaceholder, HumanMessagePromptTemplate } from 'langchain/prompts'
import { BaseMessagePromptTemplate } from 'langchain/dist/prompts/chat'
import { BaiduWenxinModel, ChatHistory } from '../types'
import { SystemMessage } from 'langchain/schema'

const log = debug('lt:baiduwenxin')

type BaiduWenxinConfig = BaiduWenxinModel['config']
export default function createBaiduWenxin (config: BaiduWenxinConfig) {
  log('Create BaiduWenxin')
  const wenxin = new ChatBaiduWenxin({
    userId: config.userId || '',
    baiduApiKey: config.apiKey,
    baiduSecretKey: config.secretKey,
    /** @default "ERNIE-Bot-turbo" */
    modelName: config.modelName || 'ERNIE-Bot-turbo',
    temperature: config.temperature || 0.8
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
      llm: wenxin,
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