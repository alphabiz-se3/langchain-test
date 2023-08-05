import { ChatGoogleVertexAI } from 'langchain/chat_models/googlevertexai'
import { buildWithMemory } from './universal'

export default function createVertex (config: any) {
  const vertext = new ChatGoogleVertexAI({
    authOptions: config.authOptions,
    model: config.model,
    temperature: config.temperature || 0.8
  })
  return buildWithMemory(vertext, config)
}
