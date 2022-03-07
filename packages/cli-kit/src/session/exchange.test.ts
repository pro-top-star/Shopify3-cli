/* eslint-disable @typescript-eslint/naming-convention */
import {Response} from 'node-fetch'
import {describe, it, expect, vi, afterAll, beforeAll} from 'vitest'

import {identity} from '../environment/fqdn'
import {fetch} from '../http'

import {
  exchangeAccessForApplicationTokens,
  exchangeCodeForAccessToken,
  ExchangeScopes,
} from './exchange'
import {applicationId, clientId} from './identity'
import {IdentityToken} from './schema'

const currentDate = new Date(2022, 1, 1, 10)
const expiredDate = new Date(2022, 1, 1, 11)

const data: any = {
  access_token: 'access_token',
  refresh_token: 'refresh_token',
  scope: 'scope scope2',
  expires_in: 3600,
}

const identityToken: IdentityToken = {
  accessToken: data.access_token,
  refreshToken: data.refresh_token,
  expiresAt: expiredDate,
  scopes: data.scope.split(' '),
}

beforeAll(() => {
  vi.mock('../http')
  vi.mock('../environment/fqdn')
  vi.mock('./identity')
  vi.mocked(clientId).mockReturnValue('clientId')
  vi.setSystemTime(currentDate)
  vi.mocked(applicationId).mockImplementation((api) => api)
  vi.mocked(identity).mockResolvedValue('fqdn.com')
})

afterAll(() => {
  // Restore Date mock
  vi.useRealTimers()
})

describe('exchange code for identity token', () => {
  const code = {code: 'code', codeVerifier: 'verifier'}

  it('obtains an identity token from a authorization code', async () => {
    // Given
    const response = new Response(JSON.stringify(data))
    vi.mocked(fetch).mockResolvedValue(response)

    // When
    const got = await exchangeCodeForAccessToken(code)

    // Then
    expect(fetch).toBeCalledWith(
      'https://fqdn.com/oauth/token?grant_type=authorization_code&code=code&redirect_uri=http%3A%2F%2F127.0.0.1%3A3456&client_id=clientId&code_verifier=verifier',
      {method: 'POST'},
    )
    expect(got).toEqual(identityToken)
  })

  it('Throws HTTP error if the request fails', () => {
    // Given
    const response = new Response('', {status: 500})
    vi.mocked(fetch).mockResolvedValue(response)

    // When
    const got = exchangeCodeForAccessToken(code)

    // Then
    return expect(got).rejects.toThrow('HTTP 500')
  })
})

describe('exchange identity token for application tokens', () => {
  const scopes = {admin: [], partners: [], storefront: []}

  it('returns tokens for all APIs if a store is passed', async () => {
    // Given
    const response = new Response(JSON.stringify(data))

    // Need to do it 3 times because a Response can only be used once
    vi.mocked(fetch)
      .mockResolvedValue(response)
      .mockResolvedValueOnce(response.clone())
      .mockResolvedValueOnce(response.clone())

    // When
    const got = await exchangeAccessForApplicationTokens(
      identityToken,
      scopes,
      'storeFQDN',
    )

    // Then
    const expected = {
      partners: {
        accessToken: 'access_token',
        expiresAt: expiredDate,
        scopes: ['scope', 'scope2'],
      },
      'storefront-renderer': {
        accessToken: 'access_token',
        expiresAt: expiredDate,
        scopes: ['scope', 'scope2'],
      },
      'storeFQDN-admin': {
        accessToken: 'access_token',
        expiresAt: expiredDate,
        scopes: ['scope', 'scope2'],
      },
    }
    expect(got).toEqual(expected)
  })

  it('does not return token for admin if there is no store', async () => {
    // Given
    const response = new Response(JSON.stringify(data))

    // Need to do it 3 times because a Response can only be used once
    vi.mocked(fetch)
      .mockResolvedValue(response)
      .mockResolvedValueOnce(response.clone())
      .mockResolvedValueOnce(response.clone())

    // When
    const got = await exchangeAccessForApplicationTokens(
      identityToken,
      scopes,
      undefined,
    )

    // Then
    const expected = {
      partners: {
        accessToken: 'access_token',
        expiresAt: expiredDate,
        scopes: ['scope', 'scope2'],
      },
      'storefront-renderer': {
        accessToken: 'access_token',
        expiresAt: expiredDate,
        scopes: ['scope', 'scope2'],
      },
    }
    expect(got).toEqual(expected)
  })
})
