import {ApplicationToken} from 'session/schema'
import {test, vi, expect, describe} from 'vitest'
import {request as graphqlRequest} from 'graphql-request'

import * as admin from './admin'
import {buildHeaders} from './common'

vi.mock('graphql-request', async () => {
  const {gql} = await vi.importActual('graphql-request')
  return {
    request: vi.fn(),
    gql,
  }
})

vi.mock('./common')

const mockedRequest = vi.mocked(graphqlRequest)
const mockedHeaders = vi.mocked(buildHeaders)
const mockedResult = {
  publicApiVersions: [
    {
      handle: '2021-01',
      supported: false,
    },
    {
      handle: '2022-01',
      supported: true,
    },
    {
      handle: '2019-01',
      supported: true,
    },
  ],
}

const mockedToken: ApplicationToken = {
  accessToken: 'mytoken',
  expiresAt: new Date(),
  scopes: [],
}

describe('admin-api', () => {
  test('calls the graphql client twice: get api version and then execute the request', async () => {
    // Given
    vi.mocked(graphqlRequest).mockResolvedValue(mockedResult)

    // When
    await admin.request('query', mockedToken, 'shop', {})

    // Then
    expect(mockedRequest).toHaveBeenCalledTimes(2)
  })

  test('request is called with correct parameters', async () => {
    // Given
    const headers = {'custom-header': mockedToken.accessToken}
    vi.mocked(graphqlRequest).mockResolvedValue(mockedResult)
    vi.mocked(buildHeaders).mockResolvedValue(headers)

    // When
    await admin.request('query', mockedToken, 'shop', {variables: 'variables'})

    // Then
    expect(mockedRequest).toHaveBeenLastCalledWith(
      'https://shop/admin/api/2022-01/graphql.json',
      'query',
      {variables: 'variables'},
      headers,
    )
  })

  test('buildHeaders is called with user token', async () => {
    // Given
    vi.mocked(graphqlRequest).mockResolvedValue(mockedResult)

    // When
    await admin.request('query', mockedToken, 'shop', {})

    // Then
    expect(mockedHeaders).toHaveBeenCalledWith(mockedToken.accessToken)
  })
})
