import Command from '@shopify/cli-kit/node/base-command'
import {cli, output} from '@shopify/cli-kit'
import {Flags} from '@oclif/core'

export default class Logs extends Command {
  static description = 'View full debug logs from the Shopify CLI'

  static flags = {
    ...cli.globalFlags,
    stream: Flags.string({
      hidden: false,
      description: 'Choose which logs to view',
      options: ['cli', 'create-app', 'create-hydrogen'],
      default: 'cli',
      env: 'SHOPIFY_FLAG_STREAM',
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(Logs)
    await output.pageLogs(flags.stream)
  }
}
