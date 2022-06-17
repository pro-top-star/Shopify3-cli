import {haiku, ui} from '@shopify/cli-kit'

interface InitOptions {
  name?: string
  template?: string
}

interface InitOutput {
  name: string
  template: string
}

// Eventually this list should be taken from a remote location
// That way we don't have to update the CLI every time we add a template
export const templateURLMap = {
  node: 'https://github.com/Shopify/shopify-app-template-node#cli_three',
  php: 'https://github.com/Shopify/shopify-app-template-php#cli_three',
}

const init = async (options: InitOptions, prompt = ui.prompt): Promise<InitOutput> => {
  const defaults = {
    name: haiku.generate('app'),
    template: templateURLMap.node,
  }

  const questions: ui.Question[] = []
  if (!options.name) {
    questions.push({
      type: 'input',
      name: 'name',
      preface: '\nWelcome. Let’s get started by naming your app. You can change it later.',
      message: "Your app's name?",
      default: defaults.name,
      validate: (value) => {
        if (value.length === 0) {
          return "App Name can't be empty"
        }
        if (value.length > 30) {
          return 'Enter a shorter name (30 character max.)'
        }
        return true
      },
    })
  }

  if (!options.template && Object.keys(templateURLMap).length > 1) {
    questions.push({
      type: 'select',
      name: 'template',
      choices: Object.keys(templateURLMap),
      message: 'Which template would you like to use?',
      default: defaults.template,
    })
  }

  const promptOutput: InitOutput = await prompt(questions)
  const answers = {
    ...options,
    ...promptOutput,
  }

  const templateURL = templateURLMap[answers.template as keyof typeof templateURLMap]
  answers.template = templateURL || answers.template || defaults.template

  return answers
}

export default init
