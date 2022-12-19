import {ensureDevEnvironment} from './environment.js'
import {generateFrontendURL, generatePartnersURLs, getURLs, shouldOrPromptUpdateURLs, updateURLs} from './dev/urls.js'
import {installAppDependencies} from './dependencies.js'
import {devUIExtensions} from './dev/extension.js'
import {outputAppURL, outputExtensionsMessages, outputUpdateURLsResult} from './dev/output.js'
import {themeExtensionArgs} from './dev/theme-extension-args.js'
import {
  ReverseHTTPProxyTarget,
  runConcurrentHTTPProcessesAndPathForwardTraffic,
} from '../utilities/app/http-reverse-proxy.js'
import {AppInterface, AppConfiguration, Web, WebType} from '../models/app/app.js'
import metadata from '../metadata.js'
import {UIExtension} from '../models/app/extensions.js'
import {fetchProductVariant} from '../utilities/extensions/fetch-product-variant.js'
import {load} from '../models/app/loader.js'
import {fetchSpecifications} from '../utilities/extensions/fetch-extension-specifications.js'
import {analytics, output, system, session, abort, string, environment} from '@shopify/cli-kit'
import {Config} from '@oclif/core'
import {execCLI2} from '@shopify/cli-kit/node/ruby'
import {renderConcurrent} from '@shopify/cli-kit/node/ui'
import {getAvailableTCPPort} from '@shopify/cli-kit/node/tcp'
import {Writable} from 'node:stream'

export interface DevOptions {
  directory: string
  id?: number
  apiKey?: string
  storeFqdn?: string
  reset: boolean
  update: boolean
  commandConfig: Config
  skipDependenciesInstallation: boolean
  subscriptionProductUrl?: string
  checkoutCartUrl?: string
  tunnelUrl?: string
  tunnel: boolean
  noTunnel: boolean
  theme?: string
  themeExtensionPort?: number
}

interface DevWebOptions {
  backendPort: number
  apiKey: string
  apiSecret?: string
  hostname?: string
  scopes?: AppConfiguration['scopes']
}

async function dev(options: DevOptions) {
  const skipDependenciesInstallation = options.skipDependenciesInstallation

  // First ensure we have a valid environment, we can't load the local app until we are logged in
  // We need to fetch the Specifications from remote
  const token = await session.ensureAuthenticatedPartners()
  const {
    identifiers,
    storeFqdn,
    remoteApp,
    updateURLs: cachedUpdateURLs,
    tunnelPlugin,
  } = await ensureDevEnvironment(options, token)

  const apiKey = identifiers.app
  const allExtensionSpecs = await fetchSpecifications(token, apiKey)

  // Only load the app if the user has access to all extensions defined in it
  let localApp = await load(options.directory, allExtensionSpecs)

  if (!skipDependenciesInstallation) {
    localApp = await installAppDependencies(localApp)
  }

  const {frontendUrl, frontendPort, usingLocalhost} = await generateFrontendURL({
    ...options,
    app: localApp,
    cachedTunnelPlugin: tunnelPlugin,
  })

  const backendPort = await getAvailableTCPPort()

  const frontendConfig = localApp.webs.find(({configuration}) => configuration.type === WebType.Frontend)
  const backendConfig = localApp.webs.find(({configuration}) => configuration.type === WebType.Backend)

  /** If the app doesn't have web/ the link message is not necessary */
  const exposedUrl = usingLocalhost ? `${frontendUrl}:${frontendPort}` : frontendUrl
  let shouldUpdateURLs = false
  if ((frontendConfig || backendConfig) && options.update) {
    const currentURLs = await getURLs(apiKey, token)
    const newURLs = generatePartnersURLs(exposedUrl, backendConfig?.configuration.authCallbackPath)
    shouldUpdateURLs = await shouldOrPromptUpdateURLs({
      currentURLs,
      appDirectory: localApp.directory,
      cachedUpdateURLs,
      newApp: remoteApp.newApp,
    })
    if (shouldUpdateURLs) await updateURLs(newURLs, apiKey, token)
    await outputUpdateURLsResult(shouldUpdateURLs, newURLs, remoteApp)
    outputAppURL(storeFqdn, exposedUrl)
  }

  // If we have a real UUID for an extension, use that instead of a random one
  localApp.extensions.ui.forEach((ext) => (ext.devUUID = identifiers.extensions[ext.localIdentifier] ?? ext.devUUID))

  const backendOptions = {
    apiKey,
    backendPort,
    scopes: localApp.configuration.scopes,
    apiSecret: (remoteApp.apiSecret as string) ?? '',
    hostname: exposedUrl,
  }

  const proxyTargets: ReverseHTTPProxyTarget[] = []
  const proxyPort = usingLocalhost ? await getAvailableTCPPort() : frontendPort
  const proxyUrl = usingLocalhost ? `${frontendUrl}:${proxyPort}` : frontendUrl

  if (localApp.extensions.ui.length > 0) {
    const devExt = await devUIExtensionsTarget({
      app: localApp,
      id: remoteApp.id,
      apiKey,
      url: proxyUrl,
      storeFqdn,
      grantedScopes: remoteApp.grantedScopes,
      subscriptionProductUrl: options.subscriptionProductUrl,
      checkoutCartUrl: options.checkoutCartUrl,
    })
    proxyTargets.push(devExt)
  }

  outputExtensionsMessages(localApp, storeFqdn, proxyUrl)

  const additionalProcesses: output.OutputProcess[] = []

  if (localApp.extensions.theme.length > 0) {
    const adminSession = await session.ensureAuthenticatedAdmin(storeFqdn)
    const storefrontToken = await session.ensureAuthenticatedStorefront()
    const extension = localApp.extensions.theme[0]!
    const args = await themeExtensionArgs(extension, apiKey, token, options)
    const devExt = await devThemeExtensionTarget(args, adminSession, storefrontToken, token)
    additionalProcesses.push(devExt)
  }

  if (backendConfig) {
    additionalProcesses.push(await devBackendTarget(backendConfig, backendOptions))
  }

  if (frontendConfig) {
    const frontendOptions: DevFrontendTargetOptions = {
      web: frontendConfig,
      apiKey,
      scopes: localApp.configuration.scopes,
      apiSecret: (remoteApp.apiSecret as string) ?? '',
      hostname: frontendUrl,
      backendPort,
    }

    if (usingLocalhost) {
      additionalProcesses.push(await devFrontendNonProxyTarget(frontendOptions, frontendPort))
    } else {
      proxyTargets.push(await devFrontendProxyTarget(frontendOptions))
    }
  }

  await logMetadataForDev({devOptions: options, tunnelUrl: frontendUrl, shouldUpdateURLs, storeFqdn})

  await analytics.reportEvent({config: options.commandConfig})

  if (proxyTargets.length === 0) {
    await renderConcurrent({processes: additionalProcesses})
  } else {
    await runConcurrentHTTPProcessesAndPathForwardTraffic(proxyPort, proxyTargets, additionalProcesses)
  }
}

interface DevFrontendTargetOptions extends DevWebOptions {
  web: Web
  backendPort: number
}

async function devFrontendNonProxyTarget(
  options: DevFrontendTargetOptions,
  port: number,
): Promise<output.OutputProcess> {
  const devFrontend = await devFrontendProxyTarget(options)
  return {
    prefix: devFrontend.logPrefix,
    action: async (stdout: Writable, stderr: Writable, signal: abort.Signal) => {
      await devFrontend.action(stdout, stderr, signal, port)
    },
  }
}

function devThemeExtensionTarget(
  args: string[],
  adminSession: session.AdminSession,
  storefrontToken: string,
  token: string,
): output.OutputProcess {
  return {
    prefix: 'extensions',
    action: async (_stdout: Writable, _stderr: Writable, _signal: abort.Signal) => {
      await execCLI2(['extension', 'serve', ...args], {adminSession, storefrontToken, token})
    },
  }
}

async function devFrontendProxyTarget(options: DevFrontendTargetOptions): Promise<ReverseHTTPProxyTarget> {
  const {commands} = options.web.configuration
  const [cmd, ...args] = commands.dev.split(' ')

  return {
    logPrefix: options.web.configuration.type,
    action: async (stdout: Writable, stderr: Writable, signal: abort.Signal, port: number) => {
      await system.exec(cmd!, args, {
        cwd: options.web.directory,
        stdout,
        stderr,
        env: {
          ...(await getDevEnvironmentVariables(options)),
          BACKEND_PORT: `${options.backendPort}`,
          PORT: `${port}`,
          FRONTEND_PORT: `${port}`,
          APP_URL: options.hostname,
          APP_ENV: 'development',
          // Note: These are Laravel varaibles for backwards compatibility with 2.0 templates.
          SERVER_PORT: `${port}`,
        },
        signal,
      })
    },
  }
}

async function getDevEnvironmentVariables(options: DevWebOptions) {
  return {
    ...process.env,
    SHOPIFY_API_KEY: options.apiKey,
    SHOPIFY_API_SECRET: options.apiSecret,
    HOST: options.hostname,
    SCOPES: options.scopes,
    NODE_ENV: `development`,
    ...(environment.service.isSpinEnvironment() && {
      SHOP_CUSTOM_DOMAIN: `shopify.${await environment.spin.fqdn()}`,
    }),
  }
}

async function devBackendTarget(web: Web, options: DevWebOptions): Promise<output.OutputProcess> {
  const {commands} = web.configuration
  const [cmd, ...args] = commands.dev.split(' ')
  const env = {
    ...(await getDevEnvironmentVariables(options)),
    // SERVER_PORT is the convention Artisan uses
    PORT: `${options.backendPort}`,
    SERVER_PORT: `${options.backendPort}`,
    BACKEND_PORT: `${options.backendPort}`,
  }

  return {
    prefix: web.configuration.type,
    action: async (stdout: Writable, stderr: Writable, signal: abort.Signal) => {
      await system.exec(cmd!, args, {
        cwd: web.directory,
        stdout,
        stderr,
        signal,
        env: {
          ...process.env,
          ...env,
        },
      })
    },
  }
}

interface DevUIExtensionsTargetOptions {
  app: AppInterface
  apiKey: string
  url: string
  storeFqdn: string
  grantedScopes: string[]
  id?: string
  subscriptionProductUrl?: string
  checkoutCartUrl?: string
}

async function devUIExtensionsTarget({
  app,
  apiKey,
  id,
  url,
  storeFqdn,
  grantedScopes,
  subscriptionProductUrl,
  checkoutCartUrl,
}: DevUIExtensionsTargetOptions): Promise<ReverseHTTPProxyTarget> {
  const cartUrl = await buildCartURLIfNeeded(app.extensions.ui, storeFqdn, checkoutCartUrl)
  return {
    logPrefix: 'extensions',
    pathPrefix: '/extensions',
    action: async (stdout: Writable, stderr: Writable, signal: abort.Signal, port: number) => {
      await devUIExtensions({
        app,
        id,
        extensions: app.extensions.ui,
        stdout,
        stderr,
        signal,
        url,
        port,
        storeFqdn,
        apiKey,
        grantedScopes,
        checkoutCartUrl: cartUrl,
        subscriptionProductUrl,
      })
    },
  }
}

/**
 * To prepare Checkout UI Extensions for dev'ing we need to retrieve a valid product variant ID
 * @param extensions - The UI Extensions to dev
 * @param store - The store FQDN
 */
async function buildCartURLIfNeeded(extensions: UIExtension[], store: string, checkoutCartUrl?: string) {
  const hasUIExtension = extensions.map((ext) => ext.type).includes('checkout_ui_extension')
  if (!hasUIExtension) return undefined
  if (checkoutCartUrl) return checkoutCartUrl
  const variantId = await fetchProductVariant(store)
  return `/cart/${variantId}:1`
}

async function logMetadataForDev(options: {
  devOptions: DevOptions
  tunnelUrl: string
  shouldUpdateURLs: boolean
  storeFqdn: string
}) {
  const tunnelType = await analytics.getAnalyticsTunnelType(options.devOptions.commandConfig, options.tunnelUrl)
  await metadata.addPublic(() => ({
    cmd_dev_tunnel_type: tunnelType,
    cmd_dev_tunnel_custom_hash: tunnelType === 'custom' ? string.hashString(options.tunnelUrl) : undefined,
    cmd_dev_urls_updated: options.shouldUpdateURLs,
    store_fqdn_hash: string.hashString(options.storeFqdn),
    cmd_app_dependency_installation_skipped: options.devOptions.skipDependenciesInstallation,
    cmd_app_reset_used: options.devOptions.reset,
  }))

  await metadata.addSensitive(() => ({
    store_fqdn: options.storeFqdn,
    cmd_dev_tunnel_custom: tunnelType === 'custom' ? options.tunnelUrl : undefined,
  }))
}

export default dev
