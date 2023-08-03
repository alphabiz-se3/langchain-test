import { ChatHistory } from '../types'

export interface ChatInstance {
  ask (question: string): Promise<string>
  getHistory (): Promise<ChatHistory[]>
}
export interface InitFunction {
  (memories?: ChatHistory[]): ChatInstance
}
export interface Model {
  id: string|number,
  type: string,
  config: any,
  withMemory: InitFunction
}
