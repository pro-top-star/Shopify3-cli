import {buildHeaders, sanitizedHeadersOutput} from './common.js'
import {AdminSession} from '../session.js'
import {debug, content, token as outputToken} from '../output.js'
import {Bug, Abort} from '../error.js'
import {request as graphqlRequest, gql, RequestDocument, Variables, ClientError} from 'graphql-request'

const UnauthorizedAccessError = (store: string) => {
  const adminLink = outputToken.link(`URL`, `https://${store}/admin`)
  const storeName = store.replace('.myshopify.com', '')
  return new Abort(
    content`Looks like you need access to this dev store (${outputToken.link(storeName, `https://${store}`)})`,
    content`• Log in to the store directly from this ${adminLink}. If you're the store owner, then that direct log in should solve your access issue.
• If you're not the owner, create a dev store staff account for yourself. Then log in directly from the link above.
    `,
  )
}

const UnknownError = () => {
  return new Bug(`Unknown error connecting to your store`)
}

export async function request<T>(query: RequestDocument, session: AdminSession, variables?: Variables): Promise<T> {
  const version = await fetchApiVersion(session)
  const url = adminUrl(session.storeFqdn, version)
  const headers = await buildHeaders(session.token)
  debug(`
Sending Admin GraphQL request:
${query}

With variables:
${variables ? JSON.stringify(variables, null, 2) : ''}

And headers:
${sanitizedHeadersOutput(headers)}
`)
  try {
    const response = await graphqlRequest<T>(url, query, variables, headers)
    return response
  } catch (error) {
    if (error instanceof ClientError) {
      const errorMessage = content`
The Admin GraphQL API responded unsuccessfully with the HTTP status ${`${error.response.status}`} and errors:

${outputToken.json(error.response.errors)}
      `
      const abortError = new Abort(errorMessage.value)
      abortError.stack = error.stack
      throw abortError
    } else {
      throw error
    }
  }
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
    throw err.response.status === 403 ? UnauthorizedAccessError(session.storeFqdn) : UnknownError()
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
