import {vi, describe, expect, it} from 'vitest'

import {allDefaultScopes} from './session/scopes'
import {store as secureStore, fetch as secureFetch} from './session/store'
import {ApplicationToken, IdentityToken, Session} from './session/schema'
import {
  exchangeAccessForApplicationTokens,
  exchangeCodeForAccessToken,
} from './session/exchange'
import {ensureAuthenticated, OAuthApplications} from './session'
import {identity} from './environment/fqdn'
import {authorize} from './session/authorize'

vi.mock('./environment/fqdn')
vi.mock('./session/identity')
vi.mock('./session/authorize')
vi.mock('./session/exchange')
vi.mock('./session/scopes')
vi.mock('./session/store')
vi.mocked(allDefaultScopes).mockImplementation((scopes) => scopes || [])

const pastDate = new Date(2022, 1, 1, 9)
const currentDate = new Date(2022, 1, 1, 10)
const futureDate = new Date(2022, 1, 1, 11)

const code = {code: 'code', codeVerifier: 'verifier'}
const validIdentityToken: IdentityToken = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  expiresAt: futureDate,
  scopes: ['scope', 'scope2'],
}

const noScopesToken: IdentityToken = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  expiresAt: futureDate,
  scopes: [],
}

const expiredIdentityToken: IdentityToken = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  expiresAt: pastDate,
  scopes: ['scope', 'scope2'],
}

const appTokens: {[x: string]: ApplicationToken} = {
  // Admin APIs includes domain in the key
  'myStoreName-appId': {
    accessToken: 'access_token',
    expiresAt: futureDate,
    scopes: ['scope', 'scope2'],
  },
  appId1: {
    accessToken: 'access_token',
    expiresAt: futureDate,
    scopes: ['scope1'],
  },
  appId2: {
    accessToken: 'access_token',
    expiresAt: futureDate,
    scopes: ['scope2'],
  },
}

const fqdn = 'fqdn.com'

const validSession: Session = {
  [fqdn]: {
    identity: validIdentityToken,
    applications: appTokens,
  },
}

describe('ensureAuthenticated when previous session is invalid', () => {
  it('executes complete auth flow if there is no session', async () => {
    await testInvalidSessions(undefined)
  })

  it('executes complete auth flow if session is for a different fqdn', async () => {
    const invalidSession: Session = {
      randomFQDN: {
        identity: validIdentityToken,
        applications: appTokens,
      },
    }
    await testInvalidSessions(invalidSession)
  })

  it('executes complete auth flow if requesting additional scopes', async () => {
    const invalidSession: Session = {
      [fqdn]: {
        identity: validIdentityToken,
        applications: appTokens,
      },
    }
    await testInvalidSessions(invalidSession)
  })

  // it('executes complete auth flow and saves session in store', async () => {
  //   // Given
  //   const oauth: OAuthApplications = {
  //     adminApi: {storeFqdn: 'mystore', scopes: []},
  //     partnersApi: {scopes: []},
  //     storefrontRendererApi: {scopes: []},
  //   }
  //   vi.mocked(secureStore.fetch).mockResolvedValue(undefined)
  //   vi.mocked(identity).mockResolvedValue(fqdn)
  //   vi.mocked(authorize).mockResolvedValue(code)
  //   vi.mocked(exchangeCodeForAccessToken).mockResolvedValue(validIdentityToken)
  //   vi.mocked(exchangeAccessForApplicationTokens).mockResolvedValue(appTokens)

  //   const expectedSession: Session = {
  //     [fqdn]: {
  //       identity: validIdentityToken,
  //       applications: appTokens,
  //     },
  //   }

  //   // When
  //   await ensureAuthenticated(oauth)

  //   // Then
  //   expect(secureStore.store).toBeCalledWith(expectedSession)
  // })
})

describe('ensureAuthenticated when there is a previous invalid session', () => {
  it('executes complete flow if the older session has less scopes', () => {})
})

describe('ensureAuthenticated when there is a previous session for same fqdn and identity token has valid scopes', () => {
  it('does nothing if session is not expired and has valid scopes', () => {})
  it('refreshes all tokens if session is expired', () => {})
  it('refreshes app tokens if any app is expired', () => {})
  it('refreshes app tokens if admin needs a new store', () => {})
  it('refreshes app tokens if we are missing app tokens', () => {})
})

async function testInvalidSessions(session: Session | undefined) {
  // Given
  const oauth: OAuthApplications = {
    adminApi: {storeFqdn: 'mystore', scopes: []},
    partnersApi: {scopes: []},
    storefrontRendererApi: {scopes: []},
  }
  vi.mocked(secureFetch).mockResolvedValue(session)
  vi.mocked(identity).mockResolvedValue(fqdn)
  vi.mocked(authorize).mockResolvedValue(code)
  vi.mocked(exchangeCodeForAccessToken).mockResolvedValue(validIdentityToken)
  vi.mocked(exchangeAccessForApplicationTokens).mockResolvedValue(appTokens)

  const expectedSession: Session = {
    [fqdn]: {
      identity: validIdentityToken,
      applications: appTokens,
    },
  }

  // When
  await ensureAuthenticated(oauth)

  // Then
  expect(secureStore).toBeCalledWith(expectedSession)
}
