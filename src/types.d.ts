export interface ChatModel {
  id: string,
  type: string,
  config: any
}
export interface OpenAIModel extends ChatModel {
  type: 'openAI',
  config: {
    apiKey: string,
    systemPrompt?: string,
    temperature?: number,
  }
}
export interface BaiduWenxinModel extends ChatModel {
  type: 'baiduwenxin',
  config: {
    apiKey: string,
    secretKey: string,
    userId?: string,
    /** @default "ERNIE-Bot-turbo" */
    modelName?: string,
    temperature?: number,
    systemPrompt?: string,
  }
}
export interface ChatHistory {
  type: 'ai' | 'human' | 'system'
  message: string
}

export interface Agent {
  type: string,
  config: any
}
