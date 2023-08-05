/**
 * TODO:
 * Most codes of each models are same. We should use an universal constructor
 * to create models instead of writing same codes everywhere.
 */
import debug from 'debug'
import { BaseChatModel } from 'langchain/chat_models/base'
import { ChatHistory } from '../types'
import { BufferMemory, ChatMessageHistory } from 'langchain/memory'
import { SystemMessage } from 'langchain/schema'
import { ConversationChain } from 'langchain/chains'
import { ChatPromptTemplate } from 'langchain/prompts'
import { BaseMessagePromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate } from 'langchain/dist/prompts/chat'

const log = debug('lt:universal')

export function buildWithMemory (model: BaseChatModel, config: any) {
  const messages: BaseMessagePromptTemplate[] = []
  if (config.systemPrompt) {
    messages.push(SystemMessagePromptTemplate.fromTemplate(config.systemPrompt))
  }
  messages.push(
    new MessagesPlaceholder('history'),
    HumanMessagePromptTemplate.fromTemplate('{question}')
  )
  const prompt = ChatPromptTemplate.fromPromptMessages(messages)
  return function withMemory(memories: ChatHistory[] = []) {
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
      llm: model,
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
