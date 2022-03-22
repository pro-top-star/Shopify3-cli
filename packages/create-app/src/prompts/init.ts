import {ui} from '@shopify/cli-kit'

interface InitOptions {
  name?: string
}

interface InitOutput {
  name: string
}

const init = async (options: InitOptions, prompt = ui.prompt): Promise<InitOutput> => {
  const questions: ui.Question[] = []
  if (!options.name) {
    questions.push({
      type: 'input',
      name: 'name',
      message: "Your app's working name?",
      default: 'app',
      validate: (value) => {
        if (value.length === 0) {
          return 'App Name cannot be empty'
        }
        if (value.length > 30) {
          return 'App name is too long (maximum is 30 characters)'
        }
        return true
      },
    })
  }
  const promptOutput: InitOutput = await prompt(questions)
  return {...options, ...promptOutput}
}

export default init
