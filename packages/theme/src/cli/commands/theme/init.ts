import {Command, Flags} from '@oclif/core'
import {path, ruby, ui} from '@shopify/cli-kit'

export default class Init extends Command {
  static description = 'Clones a Git repository to use as a starting point for building a new theme.'

  static args = [
    {
      name: 'name',
      description: 'Name of the new theme',
      required: false,
      parse: (input: string) => Promise.resolve(path.resolve(input)),
    },
  ]

  static flags = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'clone-url': Flags.string({
      char: 'u',
      description:
        "The Git URL to clone from. Defaults to Shopify's example theme, Dawn: https://github.com/Shopify/dawn.git",
      env: 'SHOPIFY_FLAG_CLONE_URL',
    }),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(Init)
    const workingPath = args.name || (await this.promptName())
    const command = ['theme', 'init', workingPath]
    await ruby.execCLI(command)
  }

  async promptName() {
    const question: ui.Question = {type: 'input', name: 'name', message: 'Name of the new theme'}
    const {name} = await ui.prompt([question])
    return path.resolve(name)
  }
}
