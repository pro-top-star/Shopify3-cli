import initPrompt from '../prompts/init'
import initService from '../services/init'
import {Command, Flags} from '@oclif/core'
import {path} from '@shopify/cli-kit'

export default class Init extends Command {
  static flags = {
    name: Flags.string({
      char: 'n',
      env: 'SHOPIFY_FLAG_NAME',
      hidden: false,
    }),
    path: Flags.string({
      char: 'p',
      env: 'SHOPIFY_FLAG_PATH',
      parse: (input, _) => Promise.resolve(path.resolve(input)),
      hidden: false,
    }),
    template: Flags.string({
      description: 'The template for app home. Eg, --template https://github.com/shopify/app-template-php',
      env: 'SHOPIFY_FLAG_TEMPLATE',
      default: 'https://github.com/shopify/bfs-app-template-test',
    }),
    'dependency-manager': Flags.string({
      char: 'd',
      env: 'SHOPIFY_FLAG_DEPENDENCY_MANAGER',
      hidden: false,
      options: ['npm', 'yarn', 'pnpm'],
    }),
    local: Flags.boolean({
      char: 'l',
      env: 'SHOPIFY_FLAG_LOCAL',
      default: false,
      hidden: true,
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(Init)
    const directory = flags.path ? path.resolve(flags.path) : process.cwd()
    const promptAnswers = await initPrompt({
      name: flags.name,
    })
    await initService({
      name: promptAnswers.name,
      dependencyManager: flags['dependency-manager'],
      template: flags.template,
      local: flags.local,
      directory,
    })
  }
}
