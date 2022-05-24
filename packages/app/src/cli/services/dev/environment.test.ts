import {fetchAppFromApiKey, fetchOrgAndApps, fetchOrganizations} from './fetch'
import {selectOrCreateApp} from './select-app'
import {selectStore, convertToTestStoreIfNeeded} from './select-store'
import {DevEnvironmentOptions, ensureDevEnvironment} from '../environment'
import {Organization, OrganizationApp, OrganizationStore} from '../../models/organization'
import {App, WebType, updateAppIdentifiers, getAppIdentifiers} from '../../models/app/app'
import {selectOrganizationPrompt} from '../../prompts/dev'
import {store as conf} from '@shopify/cli-kit'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {outputMocker} from '@shopify/cli-testing'

beforeEach(() => {
  vi.mock('./fetch')
  vi.mock('./select-app')
  vi.mock('./select-store')
  vi.mock('../../prompts/dev')
  vi.mock('../../models/app/app')
  vi.mock('../../utilities/app/update')
  vi.mock('./create-app')
  vi.mock('@shopify/cli-kit', async () => {
    const cliKit: any = await vi.importActual('@shopify/cli-kit')
    return {
      ...cliKit,
      session: {
        ensureAuthenticatedPartners: () => 'token',
      },
      api: {
        partners: {
          request: vi.fn(),
        },
        graphql: cliKit.api.graphql,
      },
      store: {
        setAppInfo: vi.fn(),
        getAppInfo: vi.fn(),
        clearAppInfo: vi.fn(),
      },
    }
  })
})

const ORG1: Organization = {id: '1', businessName: 'org1'}
const ORG2: Organization = {id: '2', businessName: 'org2'}
const APP1: OrganizationApp = {id: '1', title: 'app1', apiKey: 'key1', apiSecretKeys: [{secret: 'secret1'}]}
const APP2: OrganizationApp = {id: '2', title: 'app2', apiKey: 'key2', apiSecretKeys: [{secret: 'secret2'}]}
const CACHED1: conf.CachedAppInfo = {appId: 'key1', orgId: '1', storeFqdn: 'domain1'}
const STORE1: OrganizationStore = {
  shopId: '1',
  link: 'link1',
  shopDomain: 'domain1',
  shopName: 'store1',
  transferDisabled: false,
  convertableToPartnerTest: false,
}
const STORE2: OrganizationStore = {
  shopId: '2',
  link: 'link2',
  shopDomain: 'domain2',
  shopName: 'store2',
  transferDisabled: false,
  convertableToPartnerTest: false,
}
const LOCAL_APP: App = {
  name: 'my-app',
  idEnvironmentVariableName: 'SHOPIFY_APP_ID',
  directory: '',
  dependencyManager: 'yarn',
  configurationPath: '/shopify.app.toml',
  configuration: {scopes: 'read_products'},
  webs: [
    {
      directory: '',
      configuration: {
        type: WebType.Backend,
        commands: {dev: ''},
      },
    },
  ],
  nodeDependencies: {},
  environment: {
    dotenv: {},
    env: {},
  },
  extensions: {ui: [], theme: [], function: []},
}

const INPUT: DevEnvironmentOptions = {
  app: LOCAL_APP,
  reset: false,
}

const INPUT_WITH_DATA: DevEnvironmentOptions = {
  app: LOCAL_APP,
  reset: false,
  apiKey: 'key1',
  store: 'domain1',
}

const FETCH_RESPONSE = {
  organization: ORG1,
  apps: [APP1, APP2],
  stores: [STORE1, STORE2],
}

beforeEach(async () => {
  vi.mocked(getAppIdentifiers).mockResolvedValue({app: undefined})
  vi.mocked(selectOrganizationPrompt).mockResolvedValue(ORG1)
  vi.mocked(selectOrCreateApp).mockResolvedValue(APP1)
  vi.mocked(selectStore).mockResolvedValue(STORE1.shopDomain)
  vi.mocked(fetchOrganizations).mockResolvedValue([ORG1, ORG2])
  vi.mocked(fetchOrgAndApps).mockResolvedValue(FETCH_RESPONSE)
})

describe('ensureDevEnvironment', () => {
  it('returns selected data and updates internal state, without cached state', async () => {
    // Given
    vi.mocked(conf.getAppInfo).mockReturnValue(undefined)

    // When
    const got = await ensureDevEnvironment(INPUT)

    // Then
    expect(got).toEqual({
      app: {...APP1, apiSecret: 'secret1'},
      store: STORE1.shopDomain,
      identifiers: {
        app: 'key1',
        extensions: {},
      },
    })
    expect(conf.setAppInfo).toHaveBeenNthCalledWith(1, APP1.apiKey, {orgId: ORG1.id})
    expect(conf.setAppInfo).toHaveBeenNthCalledWith(2, APP1.apiKey, {storeFqdn: STORE1.shopDomain})
    expect(updateAppIdentifiers).toBeCalledWith({
      app: LOCAL_APP,
      identifiers: {
        app: APP1.apiKey,
        extensions: {},
      },
      environmentType: 'local',
    })
  })

  it('returns selected data and updates internal state, with cached state', async () => {
    // Given
    const outputMock = outputMocker.mockAndCapture()
    vi.mocked(conf.getAppInfo).mockReturnValue(CACHED1)
    vi.mocked(getAppIdentifiers).mockResolvedValue({
      app: 'key1',
    })
    vi.mocked(updateAppIdentifiers).mockResolvedValue(LOCAL_APP)

    // When
    const got = await ensureDevEnvironment(INPUT)

    // Then
    expect(got).toEqual({
      app: {...APP1, apiSecret: 'secret1'},
      store: STORE1.shopDomain,
      identifiers: {
        app: 'key1',
        extensions: {},
      },
    })
    expect(fetchOrganizations).not.toBeCalled()
    expect(selectOrganizationPrompt).not.toBeCalled()
    expect(conf.setAppInfo).toHaveBeenNthCalledWith(1, APP1.apiKey, {orgId: ORG1.id})
    expect(conf.setAppInfo).toHaveBeenNthCalledWith(2, APP1.apiKey, {storeFqdn: STORE1.shopDomain})
    expect(updateAppIdentifiers).toBeCalledWith({
      app: LOCAL_APP,
      identifiers: {
        app: APP1.apiKey,
        extensions: {},
      },
      environmentType: 'local',
    })
    expect(outputMock.output()).toMatch(/Using your previous dev settings:/)
  })

  it('returns selected data and updates internal state, with inputs from flags', async () => {
    // Given
    vi.mocked(conf.getAppInfo).mockReturnValue(undefined)
    vi.mocked(convertToTestStoreIfNeeded).mockResolvedValueOnce()
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)

    // When
    const got = await ensureDevEnvironment(INPUT_WITH_DATA)

    // Then
    expect(got).toEqual({
      app: {...APP2, apiSecret: 'secret2'},
      store: STORE1.shopDomain,
      identifiers: {
        app: 'key2',
        extensions: {},
      },
    })
    expect(conf.setAppInfo).toHaveBeenNthCalledWith(1, APP2.apiKey, {storeFqdn: STORE1.shopDomain, orgId: ORG1.id})
    expect(updateAppIdentifiers).toBeCalledWith({
      app: LOCAL_APP,
      identifiers: {
        app: APP2.apiKey,
        extensions: {},
      },
      environmentType: 'local',
    })

    expect(fetchOrganizations).toBeCalled()
    expect(selectOrganizationPrompt).toBeCalled()
    expect(selectOrCreateApp).not.toBeCalled()
    expect(selectStore).not.toBeCalled()
  })

  it('resets cached state if reset is true', async () => {
    // When
    vi.mocked(getAppIdentifiers).mockResolvedValue({
      app: APP1.apiKey,
    })
    await ensureDevEnvironment({...INPUT, reset: true})

    // Then
    expect(conf.clearAppInfo).toHaveBeenCalledWith(APP1.apiKey)
  })
})
