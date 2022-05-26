import {buildHeaders} from './common'
import {AdminSession} from '../session'
import {debug} from '../output'
import {Bug} from '../error'
import {request as graphqlRequest, gql, RequestDocument, Variables} from 'graphql-request'

const UnauthorizedAccessError = () => {
  return new Bug(
    `You can't use Shopify CLI with development stores if you only have Partner staff member access.
If you want to use Shopify CLI to work on a development store, then you should be the store owner or create a staff account on the store`,
    `If you're the store owner, then you need to log in to the store directly using the store URL at least once (for example, using %s.myshopify.com/admin) before you log in using Shopify CLI.
Logging in to the Shopify admin directly connects the development store with your Shopify login.`,
  )
}

const UnknownError = () => {
  return new Bug(`Unknown error connecting to your store`)
}

export async function request<T>(query: RequestDocument, session: AdminSession, variables?: Variables): Promise<T> {
  debug(`
Sending Admin GraphQL request:
${query}

With variables:
${variables ? JSON.stringify(variables, null, 2) : ''}
  `)
  const version = await fetchApiVersion(session)
  const url = adminUrl(session.storeFqdn, version)
  const headers = await buildHeaders(session.token)
  return graphqlRequest<T>(url, query, variables, headers)
}

async function fetchApiVersion(session: AdminSession): Promise<string> {
  const url = adminUrl(session.storeFqdn, 'unstable')
  const query = apiVersionQuery()
  const headers = await buildHeaders(session.token)

  debug(`
Sending Admin GraphQL request to URL ${url} with query:
${query}
  `)
  const data = await graphqlRequest<{
    publicApiVersions: {handle: string; supported: boolean}[]
  }>(url, query, {}, headers).catch((err) => {
    throw err.response.status === 403 ? UnauthorizedAccessError() : UnknownError()
  })

  return data.publicApiVersions
    .filter((item) => item.supported)
    .map((item) => item.handle)
    .sort()
    .reverse()[0]
}

function adminUrl(store: string, version: string | undefined): string {
  const realVersion = version || 'unstable'
  return `https://${store}/admin/api/${realVersion}/graphql.json`
}

function apiVersionQuery(): string {
  return gql`
    query {
      publicApiVersions {
        handle
        supported
      }
    }
  `
}
