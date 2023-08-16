import { ChatOpenAI } from "langchain/chat_models/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { Serper } from "langchain/tools";
import { Calculator } from "langchain/tools/calculator";
import config from '../config'
import '../useProxy'
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import { AIMessage, HumanMessage, SystemMessage } from 'langchain/schema';
import { ChatHistory } from '../types';
const openAIConfig = config.models.find(i => i.type === 'openAI').config
const serperConfig = config.agents.find(i => i.type === 'serper').config

export const withMemory = async (memories: ChatHistory[] = []) => {
  // process.env.LANGCHAIN_HANDLER = "langchain";
  const model = new ChatOpenAI({
    temperature: 0,
    openAIApiKey: openAIConfig.apiKey,
    // streaming: true
  });
  const tools = [
    new Serper(serperConfig.apiKey, {
      hl: "en",
      gl: "us",
    }),
    new Calculator(),
  ];

  // Passing "chat-conversational-react-description" as the agent type
  // automatically creates and uses BufferMemory with the executor.
  // If you would like to override this, you can pass in a custom
  // memory option, but the memoryKey set on it must be "chat_history".
  const chatHistory = new ChatMessageHistory()
  if (openAIConfig.systemPrompt) {
    chatHistory.addMessage(new SystemMessage(openAIConfig.systemPrompt))
  }
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
  // console.log(await chatHistory.getMessages())
  const memory = new BufferMemory({
    chatHistory,
    returnMessages: true,
    inputKey: 'input',
    memoryKey: 'chat_history'
  })
  const executor = await initializeAgentExecutorWithOptions(tools, model, {
    agentType: "chat-conversational-react-description",
    // verbose: true,
    memory,
    callbacks: [{
      handleAgentAction (action, runId, parentRunId, tags) {
        console.log('AGENT', action)
      },
      handleChainStart (chain, inputs, runId, parentRunId, tags, metadata) {
        // console.log('CHAIN', chain)
      },
      handleChainEnd (outputs, runId, parentRunId, tags) {
        // console.log('CEND', outputs)
      },
      handleAgentEnd (action, runId, parentRunId, tags) {
        // console.log('AEND', action.log)
      },
      handleLLMNewToken (token, idx, runId, parentRunId, tags) {
        console.log('>', token)
      },
    }]
  });
  console.log("Loaded agent.");

  return {
    ask (input: string) {
      return executor.stream({ input })
    },
    getHistory () {
      return chatHistory.getMessages()
    }
  }
  // if (Array.isArray(input)) {
  //   for (const i of input) {
  //     const res = await executor.call({ input: i })
  //     console.log(res)
  //     cb(res.output)
  //   }
  // } else {
  //   const res = await executor.call({ input })
  //   console.log(res)
  //   cb(res.output)
  // }
  // console.log(await memory.chatHistory.getMessages())
};

export const run = async (inputs: string|string[]) => {
  const ai = await withMemory([])
  if (Array.isArray(inputs)) {
    for (const input of inputs) {
      console.log('Q:', input)
      const res = await ai.ask('Your reply must using same language with the following question. Q: ' + input)
      // console.log('A:', res.output)
      for await (const chunk of res) {
        console.log('> ', chunk)
      }
    }
  } else {
    console.log('Q:', inputs)
    const res = await ai.ask(inputs)
    // console.log('A:', res.output)
    for await (const chunk of res) {
      console.log('> ', chunk)
    }
  }
  const his = await ai.getHistory()
  const mems = his.map(i => {
    return {
      type: i._getType(),
      message: i.content
    }
  })
  console.log(mems)
}
run([
  `Who is Olivia Wilde's boyfriend?`,
  `What is his current age?`,
  `What is his current age raised to the 0.23 power?`
]).then(() => {
  console.log('Finish')
}).catch(e => {
  console.log('Error', e)
})
// run([
//   `Hello, I'm Bob`,
//   'Who am I',
// ]).then(() => {
//   console.log('Finish')
// })
