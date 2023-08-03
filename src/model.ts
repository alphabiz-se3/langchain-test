import createOpenAI from './models/openai'

import config from './config'

import './useProxy'
import { Model } from './models/model'

// const test = async () => {
//   const withMemory = createOpenAI(config.openAI)
//   // Load histories here
//   const model = withMemory()
//   // console.log(await ask('Hello, my name is zeeis'))
//   console.log(await model.ask('What is my name?'))
//   console.log(await model.getHistory())
// }
// test()

const loadModels = () => {
  return config.models.map(m => {
    switch (m.type) {
      case 'openAI':
        return {
          id: m.id,
          type: m.type,
          config: m.config,
          withMemory: createOpenAI(m.config)
        } as Model
    }
    console.error(`Failed to load ${m.type}: unrecognized type`)
  })
}

export default loadModels
