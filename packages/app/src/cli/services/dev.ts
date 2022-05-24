import {ensureDevEnvironment} from './environment'
import {generateURL, updateURLs} from './dev/urls'
import {installAppDependencies} from './dependencies'
import {App, AppConfiguration, Web, WebType} from '../models/app/app'
import {output, port, system} from '@shopify/cli-kit'
import {Plugin} from '@oclif/core/lib/interfaces'

export interface DevOptions {
  app: App
  apiKey?: string
  store?: string
  reset: boolean
  update: boolean
  plugins: Plugin[]
  skipDependenciesInstallation: boolean
}

interface DevWebOptions {
  frontendPort: number
  backendPort: number
  apiKey: string
  apiSecret: string
  hostname: string
  scopes: AppConfiguration['scopes']
}

async function dev(options: DevOptions) {
  if (!options.skipDependenciesInstallation) {
    // eslint-disable-next-line no-param-reassign
    options = {
      ...options,
      app: await installAppDependencies(options.app),
    }
  }
  const {
    identifiers,
    store,
    app: {apiSecret},
  } = await ensureDevEnvironment(options)

  const frontendPort = await port.getRandomPort()
  const backendPort = await port.getRandomPort()
  const url: string = await generateURL(options, frontendPort)
  let updateMessage = ''
  if (options.update) {
    await updateURLs(identifiers.app, url)
    updateMessage = `\nYour app's URLs in Shopify Partners have been updated. `
  }
  const message = `${updateMessage}Preview link for viewing or sharing: `
  const storeAppUrl = `${url}/api/auth?shop=${store}`
  output.info(output.content`${message}${output.token.link(storeAppUrl, storeAppUrl)}\n`)

  devWeb(options.app.webs, {
    apiKey: identifiers.app,
    frontendPort,
    backendPort,
    scopes: options.app.configuration.scopes,
    apiSecret: apiSecret as string,
    hostname: url,
  })
}

async function devWeb(webs: Web[], options: DevWebOptions) {
  // eslint-disable-next-line @shopify/prefer-module-scope-constants
  const SHOPIFY_API_KEY = options.apiKey

  // eslint-disable-next-line @shopify/prefer-module-scope-constants
  const SHOPIFY_API_SECRET = options.apiSecret

  // eslint-disable-next-line @shopify/prefer-module-scope-constants
  const HOST = options.hostname

  // eslint-disable-next-line @shopify/prefer-module-scope-constants
  const SCOPES = options.scopes

  // eslint-disable-next-line @shopify/prefer-module-scope-constants
  const FRONTEND_PORT = `${options.frontendPort}`

  // eslint-disable-next-line @shopify/prefer-module-scope-constants
  const BACKEND_PORT = `${options.backendPort}`

  await output.concurrent(
    webs.map(({configuration, directory}: Web, _index) => {
      const {commands, type} = configuration
      const [cmd, ...args] = commands.dev.split(' ')
      const env =
        type === WebType.Backend
          ? {
              SHOPIFY_API_KEY,
              SHOPIFY_API_SECRET,
              HOST,
              BACKEND_PORT,
              SCOPES,
            }
          : {
              SHOPIFY_API_KEY,
              BACKEND_PORT,
              FRONTEND_PORT,
            }

      return {
        prefix: configuration.type,
        action: async (stdout, stderr) => {
          await system.exec(cmd, args, {
            cwd: directory,
            stdout,
            stderr,
            env: {
              ...process.env,
              ...env,
              NODE_ENV: `development`,
            },
          })
        },
      }
    }),
  )
}

export default dev
