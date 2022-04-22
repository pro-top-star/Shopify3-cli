import {Command, Flags} from '@oclif/core'
import {ruby, session, string} from '@shopify/cli-kit'
import {getThemeStore} from '$cli/utilities/theme-store'

export default class Dev extends Command {
  static description =
    'Uploads the current theme as a development theme to the connected store, then prints theme editor and preview URLs to your terminal. While running, changes will push to the store in real time.'

  static flags = {
    poll: Flags.boolean({
      description: 'Force polling to detect file changes.',
      env: 'SHOPIFY_FLAG_THEME_POLL',
    }),
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'theme-editor-sync': Flags.boolean({
      char: 'a',
      description: 'Synchronize Theme Editor updates in the local theme files.',
      env: 'SHOPIFY_FLAG_THEME_THEME_EDITOR_SYNC',
    }),
    port: Flags.string({
      description: 'The path to your theme',
      char: 'p',
      default: '.',
      env: 'SHOPIFY_FLAG_PORT',
    }),
    host: Flags.string({
      description: 'The path to your theme',
      char: 'h',
      default: '127.0.0.1',
      env: 'SHOPIFY_FLAG_HOST',
    }),
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'live-reload': Flags.string({
      description: 'The path to your theme',
      default: 'hot-reload',
      options: ['hot-reload', 'full-page', 'off'],
      env: 'SHOPIFY_FLAG_PATH',
    }),
    path: Flags.string({
      description: 'The path to your theme',
      default: '.',
      env: 'SHOPIFY_FLAG_PATH',
    }),
    store: Flags.string({
      char: 's',
      description: 'Store URL',
      env: 'SHOPIFY_FLAG_STORE',
      parse: (input, _) => Promise.resolve(string.normalizeStoreName(input)),
    }),
  }

  async run(): Promise<void> {
    const {flags, args} = await this.parse(Dev)

    const store = getThemeStore(flags)

    const command = ['theme', 'serve', flags.path]

    if (flags.poll) {
      command.push('--poll')
    }
    if (flags['theme-editor-sync']) {
      command.push('--theme-editor-sync')
    }
    if (flags.port) {
      command.push('--port')
      command.push(flags.port)
    }
    if (flags.host) {
      command.push('--host')
      command.push(flags.host)
    }
    if (flags['live-reload']) {
      command.push('--live-reload')
      command.push(flags['live-reload'])
    }

    const adminSession = await session.ensureAuthenticatedAdmin(store)
    await ruby.execCLI(command, adminSession)
  }
}
