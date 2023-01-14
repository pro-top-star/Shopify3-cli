import {buildHeaders, sanitizedHeadersOutput} from './headers.js'
import constants from '../../../constants.js'
import {randomUUID} from '../../../public/node/crypto.js'
import {firstPartyDev, isUnitTest} from '../../../public/node/environment/local.js'
import {test, vi, expect, describe, beforeEach} from 'vitest'

beforeEach(() => {
  vi.mock('../../../public/node/crypto.js')
  vi.mock('../../../public/node/environment/local.js')
  vi.mocked(isUnitTest).mockReturnValue(true)
  vi.mock('../version')
})

describe('common API methods', () => {
  test('headers are built correctly when firstPartyDev yields true', async () => {
    // Given
    vi.mocked(randomUUID).mockReturnValue('random-uuid')
    vi.mocked(firstPartyDev).mockReturnValue(true)
    // When
    const headers = await buildHeaders('my-token')

    // Then
    const version = await constants.versions.cliKit()
    expect(headers).toEqual({
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': 'Bearer my-token',
      'X-Request-Id': 'random-uuid',
      'User-Agent': `Shopify CLI; v=${version}`,
      authorization: 'Bearer my-token',
      'Sec-CH-UA-PLATFORM': process.platform,
      'X-Shopify-Cli-Employee': '1',
    })
  })

  test('when user is not employee, do not include header', async () => {
    // Given
    vi.mocked(randomUUID).mockReturnValue('random-uuid')
    vi.mocked(firstPartyDev).mockReturnValue(false)
    // When
    const headers = await buildHeaders('my-token')

    // Then
    const version = await constants.versions.cliKit()
    expect(headers).toEqual({
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': 'Bearer my-token',
      'X-Request-Id': 'random-uuid',
      'User-Agent': `Shopify CLI; v=${version}`,
      authorization: 'Bearer my-token',
      'Sec-CH-UA-PLATFORM': process.platform,
    })
  })

  test('sanitizedHeadersOutput removes the headers that include the token', () => {
    // Given
    const headers = {
      'User-Agent': 'useragent',
      'X-Request-Id': 'uuid',
      Authorization: 'token',
      authorization: 'token',
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': 'token',
    }

    // When
    const got = sanitizedHeadersOutput(headers)

    // Then
    expect(got).toMatchInlineSnapshot(`
      " - User-Agent: useragent
       - X-Request-Id: uuid
       - Content-Type: application/json"
    `)
  })
})
