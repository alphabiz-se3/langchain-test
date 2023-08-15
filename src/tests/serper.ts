import config from '../config'
import {
  LLMSingleActionAgent,
  AgentActionOutputParser,
  AgentExecutor,
} from "langchain/agents";
import { ConversationChain, LLMChain } from "langchain/chains";
import { OpenAI } from "langchain/llms/openai";
import {
  BasePromptTemplate,
  BaseStringPromptTemplate,
  SerializedBasePromptTemplate,
  renderTemplate,
} from "langchain/prompts";
import {
  InputValues,
  PartialValues,
  AgentStep,
  AgentAction,
  AgentFinish,
  SystemMessage,
} from "langchain/schema";
import { Serper, Tool } from "langchain/tools";
import { Calculator } from "langchain/tools/calculator";
import { ChatHistory } from '../types';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import '../useProxy'

const PREFIX = `Answer the following questions as best you can. You have access to the following tools:`;
const formatInstructions = (
  toolNames: string
) => `Use the following format in your response:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [${toolNames}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question`;
const SUFFIX = `Begin!

Question: {input}
Thought:{agent_scratchpad}`;

class CustomPromptTemplate extends BaseStringPromptTemplate {
  tools: Tool[];

  constructor(args: { tools: Tool[]; inputVariables: string[] }) {
    super({ inputVariables: args.inputVariables });
    this.tools = args.tools;
  }

  _getPromptType(): string {
    return 'custom'
  }

  format(input: InputValues): Promise<string> {
    /** Construct the final template */
    const toolStrings = this.tools
      .map((tool) => `${tool.name}: ${tool.description}`)
      .join("\n");
    const toolNames = this.tools.map((tool) => tool.name).join("\n");
    const instructions = formatInstructions(toolNames);
    const template = [PREFIX, toolStrings, instructions, SUFFIX].join("\n\n");
    /** Construct the agent_scratchpad */
    const intermediateSteps = input.intermediate_steps as AgentStep[];
    const agentScratchpad = intermediateSteps.reduce(
      (thoughts, { action, observation }) =>
        thoughts +
        [action.log, `\nObservation: ${observation}`, "Thought:"].join("\n"),
      ""
    );
    const newInput = { agent_scratchpad: agentScratchpad, ...input };
    /** Format the template. */
    return Promise.resolve(renderTemplate(template, "f-string", newInput));
  }

  partial(_values: PartialValues): Promise<BaseStringPromptTemplate> {
    throw new Error("Not implemented");
  }

  serialize(): SerializedBasePromptTemplate {
    throw new Error("Not implemented");
  }
}

class CustomOutputParser extends AgentActionOutputParser {
  lc_namespace = ["langchain", "agents", "custom_llm_agent"];

  async parse(text: string): Promise<AgentAction | AgentFinish> {
    if (text.includes("Final Answer:")) {
      const parts = text.split("Final Answer:");
      const input = parts[parts.length - 1].trim();
      const finalAnswers = { output: input };
      return { log: text, returnValues: finalAnswers };
    }

    const match = /Action: (.*)\nAction Input: (.*)/s.exec(text);
    if (!match) {
      throw new Error(`Could not parse LLM output: ${text}`);
    }

    return {
      tool: match[1].trim(),
      toolInput: match[2].trim().replace(/^"+|"+$/g, ""),
      log: text,
    };
  }

  getFormatInstructions(): string {
    throw new Error("Not implemented");
  }
}

const run = async (input: string|string[], memories: ChatHistory[] = []) => {
  const openAIConfig = config.models.find(i => i.type === 'openAI').config
  const model = new OpenAI({ temperature: 0, openAIApiKey: openAIConfig.apiKey });
  const serperAIConfig = config.agents.find(i => i.type === 'serper').config
  const tools = [
    new Serper(serperAIConfig.apiKey, {
      hl: "cn",
      gl: "cn",
    }),
    new Calculator(),
  ];

  const history = new ChatMessageHistory([
    new SystemMessage(openAIConfig.systemPrompt)
  ])
  for (const mem of memories) {
    switch (mem.type) {
      case 'ai':
        history.addAIChatMessage(mem.message)
        break
      case 'human':
        history.addUserMessage(mem.message)
        break
      case 'system':
        history.addMessage(new SystemMessage(mem.message))
        break
      default:
        const _exhaustiveCheck = mem.type
        throw new Error(`Invalid memory type ${_exhaustiveCheck}`)
    }
  }
  const bufferMemory = new BufferMemory({
    returnMessages: true,
    memoryKey: 'history',
    chatHistory: history,
    inputKey: 'input'
  })

  const llmChain = new ConversationChain({
    prompt: new CustomPromptTemplate({
      tools,
      inputVariables: ["input", "agent_scratchpad"],
    }),
    llm: model,
    memory: bufferMemory,
  });

  const agent = new LLMSingleActionAgent({
    llmChain,
    outputParser: new CustomOutputParser(),
    stop: ["\nObservation"],
  });
  const executor = new AgentExecutor({
    agent,
    tools,
    memory: bufferMemory,
  });
  console.log("Loaded agent.");

  console.log(`Executing with input`, input);

  if (Array.isArray(input)) {
    for (const i of input) {
      console.log('ASK:', i)
      console.log('Got output:', await executor.call({ input: i }))
    }
  } else {
    const result = await executor.call({ input });
    console.log(`Got output ${result.output}`);
  }
};
run([
  `Who is Olivia Wilde's boyfriend?`,
  `What is his current age?`,
  `What is his current age raised to the 0.23 power?`
])