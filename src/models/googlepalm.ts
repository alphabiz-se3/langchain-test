import { ChatGooglePaLM } from 'langchain/chat_models/googlepalm'
import { buildWithMemory } from './universal'

export default function createPalm (config: any) {
  const palm = new ChatGooglePaLM({
    apiKey: config.apiKey,
    modelName: config.modelName,
    temperature: config.temperature || 0.8
  })
  return buildWithMemory(palm, config)
}
