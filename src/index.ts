import loadModels from './model'
import debug from 'debug'

// Load proxy config
import './useProxy'

const log = debug('lt:main')

if (require.main === module) {
  (async function run () {
    // Load all models from config.json
    const models = loadModels()
    // console.log(models)
    // Get what we want
    const model = models.find(m => m.type === 'openAI')
    log(`OpenAI model: ${model && model.type}`)
    // Use an array of `{ type: 'ai'|'human', message: string }` to load history
    const openAI = model.withMemory([])
    // Ask for it
    console.log(await openAI.ask('Hello, world!'))
    // Get chat history and maybe save to somewhere
    console.log(await openAI.getHistory())
  })()
}
