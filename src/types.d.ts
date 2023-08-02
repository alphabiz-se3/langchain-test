export interface ChatModel {
  id: string,
  type: string,
  config: any
}
export interface ChatHistory {
  type: 'ai' | 'human' | 'system'
  message: string
}