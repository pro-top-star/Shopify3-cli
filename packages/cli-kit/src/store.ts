import {content, token, debug} from './output'
import cliKitPackageJson from '../package.json'
import Conf, {Schema} from 'conf'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore

const migrations = {}

export interface CachedAppInfo {
  directory: string
  appId: string
  title?: string
  orgId?: string
  storeFqdn?: string
}

interface ConfSchema {
  appInfo: CachedAppInfo[]
  themeStore: string
  session: string
}

const schema = {
  appInfo: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
        },
        orgId: {
          type: 'string',
        },
        storeFqdn: {
          type: 'string',
        },
      },
    },
  },
} as unknown as Schema<ConfSchema>

export type LocalStore = Conf<ConfSchema>

export function createConf(projectName = 'shopify-cli-kit'): LocalStore {
  return new Conf<ConfSchema>({
    schema,
    migrations,
    projectName,
    projectVersion: cliKitPackageJson.version,
  })
}

const cliKit = createConf()

export function remove() {
  cliKit.clear()
}

export function getAppInfo(directory: string, localConf: LocalStore = cliKit): CachedAppInfo | undefined {
  debug(content`Reading cached app information for directory ${token.path(directory)}...`)
  const apps = localConf.get('appInfo') ?? []
  return apps.find((app: CachedAppInfo) => app.directory === directory)
}

export function setAppInfo(
  options: {
    directory: string
    appId: string
    title?: string
    storeFqdn?: string
    orgId?: string
  },
  localConf: LocalStore = cliKit,
): void {
  debug(content`Storing app information for directory ${token.path(options.directory)}:
${token.json(options)}
`)
  const apps = localConf.get('appInfo') ?? []
  const index = apps.findIndex((saved: CachedAppInfo) => saved.directory === options.directory)
  if (index === -1) {
    apps.push(options)
  } else {
    const app: CachedAppInfo = apps[index]
    apps[index] = {
      appId: options.appId,
      directory: options.directory,
      title: options.title ?? app.title,
      storeFqdn: options.storeFqdn ?? app.storeFqdn,
      orgId: options.orgId ?? app.orgId,
    }
  }
  localConf.set('appInfo', apps)
}

export function clearAppInfo(directory: string, localConf: LocalStore = cliKit): void {
  debug(content`Clearning app information for directory ${token.path(directory)}...`)
  const apps = localConf.get('appInfo') ?? []
  const index = apps.findIndex((saved: CachedAppInfo) => saved.directory === directory)
  if (index !== -1) {
    apps.splice(index, 1)
  }
  localConf.set('appInfo', apps)
}

export function getTheme(localConf: LocalStore = cliKit): string | undefined {
  debug(content`Getting theme store...`)
  return localConf.get('themeStore')
}

export function setTheme(store: string, localConf: LocalStore = cliKit): void {
  debug(content`Setting theme store...`)
  localConf.set('themeStore', store)
}

export function getSession(localConf: LocalStore = cliKit): string | undefined {
  debug(content`Getting session store...`)
  return localConf.get('sessionStore')
}

export function setSession(store: string, localConf: LocalStore = cliKit): void {
  debug(content`Setting session store...`)
  localConf.set('sessionStore', store)
}

export function removeSession(localConf: LocalStore = cliKit): void {
  debug(content`Removing session store...`)
  localConf.set('sessionStore', '')
}
