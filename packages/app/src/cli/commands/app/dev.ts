import {Command, Flags} from '@oclif/core'
import {path, string} from '@shopify/cli-kit'
import dev from '$cli/services/dev'
import {load as loadApp, App} from '$cli/models/app/app'

export default class Dev extends Command {
  static description = 'Run the app'

  static flags = {
    path: Flags.string({
      hidden: true,
      description: 'The path to your app directory.',
      env: 'SHOPIFY_FLAG_PATH',
    }),
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'api-key': Flags.string({
      hidden: false,
      description: 'The API key of your app.',
      env: 'SHOPIFY_FLAG_APP_API_KEY',
    }),
    store: Flags.string({
      hidden: false,
      char: 's',
      description: 'Development store URL. Must be an existing development store.',
      env: 'SHOPIFY_FLAG_STORE',
      parse: (input, _) => Promise.resolve(string.normalizeStoreName(input)),
    }),
    reset: Flags.boolean({
      hidden: false,
      description: 'Reset all your settings.',
      env: 'SHOPIFY_FLAG_RESET',
      default: false,
    }),
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'no-tunnel': Flags.boolean({
      hidden: false,
      description: 'Skips creating an HTTP tunnel.',
      env: 'SHOPIFY_FLAG_NO_TUNNEL',
      default: false,
    }),
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'no-update': Flags.boolean({
      hidden: false,
      description: 'Skips the dashboard URL update step.',
      env: 'SHOPIFY_FLAG_NO_UPDATE',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Dev)
    const directory = flags.path ? path.resolve(flags.path) : process.cwd()
    const appManifest: App = await loadApp(directory)

    await dev({
      appManifest,
      apiKey: flags['api-key'],
      store: flags.store,
      reset: flags.reset,
      tunnel: !flags['no-tunnel'],
      update: !flags['no-update'],
    })
  }
}
