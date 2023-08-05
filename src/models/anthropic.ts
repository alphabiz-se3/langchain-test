import { ChatAnthropic } from 'langchain/chat_models/anthropic'
import { buildWithMemory } from './universal'

export default function createAnthropic (config: any) {
  const anthropic = new ChatAnthropic({
    anthropicApiKey: config.apiKey,
    anthropicApiUrl: config.apiUrl,
    modelName: config.modelName,
    temperature: config.temperature || 0.8,
  })
  return buildWithMemory(anthropic, config)
}
