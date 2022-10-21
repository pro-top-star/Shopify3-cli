import {themeFlags} from '../../flags.js'
import {getThemeStore} from '../../utilities/theme-store.js'
import ThemeCommand from '../../utilities/theme-command.js'
import {Flags} from '@oclif/core'
import {cli, session} from '@shopify/cli-kit'
import {execCLI2} from '@shopify/cli-kit/node/ruby'
import {AbortController} from 'abort-controller'

export default class Dev extends ThemeCommand {
  static description =
    'Uploads the current theme as a development theme to the connected store, then prints theme editor and preview URLs to your terminal. While running, changes will push to the store in real time.'

  static flags = {
    ...cli.globalFlags,
    path: themeFlags.path,
    host: Flags.string({
      description: 'Set which network interface the web server listens on. The default value is 127.0.0.1.',
      env: 'SHOPIFY_FLAG_HOST',
    }),
    'live-reload': Flags.string({
      description: `The live reload mode switches the server behavior when a file is modified:
- hot-reload Hot reloads local changes to CSS and sections (default)
- full-page  Always refreshes the entire page
- off        Deactivate live reload`,
      default: 'hot-reload',
      options: ['hot-reload', 'full-page', 'off'],
      env: 'SHOPIFY_FLAG_LIVE_RELOAD',
    }),
    poll: Flags.boolean({
      description: 'Force polling to detect file changes.',
      env: 'SHOPIFY_FLAG_POLL',
    }),
    'theme-editor-sync': Flags.boolean({
      description: 'Synchronize Theme Editor updates in the local theme files.',
      env: 'SHOPIFY_FLAG_THEME_EDITOR_SYNC',
    }),
    port: Flags.string({
      description: 'Local port to serve theme preview from.',
      env: 'SHOPIFY_FLAG_PORT',
    }),
    store: themeFlags.store,
    theme: Flags.string({
      char: 't',
      description: 'Theme ID or name of the remote theme.',
      env: 'SHOPIFY_FLAG_THEME_ID',
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(Dev)

    const flagsToPass = this.passThroughFlags(flags, {exclude: ['path', 'store', 'verbose']})
    const command = ['theme', 'serve', flags.path, ...flagsToPass]

    const store = await getThemeStore(flags)

    let controller = new AbortController()
    await this.execute(store, command, controller, false)

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setInterval(async () => {
      console.log('Restarting theme serve command')
      controller.abort()
      controller = new AbortController()
      await this.execute(store, command, controller, true)
      console.log("Restarted theme serve command. You're good to go!")
    }, 10000)
  }

  async execute(store: string, command: string[], controller: AbortController, refresh: boolean) {
    const adminSession = await session.ensureAuthenticatedThemes(store, undefined, [], refresh)
    const storefrontToken = await session.ensureAuthenticatedStorefront()
    await execCLI2(command, {adminSession, storefrontToken, signal: controller.signal})
  }
}
