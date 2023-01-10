import {buildHeaders, RequestClientError, sanitizedHeadersOutput} from './headers.js'
import {stringifyMessage, content, token as outputToken, token, debug} from '../../../output.js'
import {Abort} from '../../../error.js'
import {httpsAgent} from '../../../http.js'
import {ClientError, GraphQLClient, RequestDocument, Variables} from 'graphql-request'

export function graphqlRequest<T>(
  query: RequestDocument,
  api: string,
  url: string,
  token: string,
  variables?: Variables,
  handleErrors = true,
): Promise<T> {
  const action = async () => {
    const headers = await buildHeaders(token)
    debugLogRequest(api, query, variables, headers)
    const clientOptions = {agent: await httpsAgent(), headers}
    const client = new GraphQLClient(url, clientOptions)
    const t0 = performance.now()
    const response = await client.request<T>(query, variables)
    const t1 = performance.now()
    debug(`Request to ${url.toString()} completed in ${Math.round(t1 - t0)} ms`)
    return response
  }

  if (handleErrors) {
    return handlingErrors(api, action)
  } else {
    return action()
  }
}

function debugLogRequest<T>(
  api: string,
  query: RequestDocument,
  variables?: Variables,
  headers: {[key: string]: string} = {},
) {
  debug(content`
Sending ${token.json(api)} GraphQL request:
${token.raw(query.toString())}

With variables:
${variables ? JSON.stringify(variables, null, 2) : ''}

And headers:
${sanitizedHeadersOutput(headers)}
`)
}

async function handlingErrors<T>(api: string, action: () => Promise<T>): Promise<T> {
  try {
    return await action()
  } catch (error) {
    if (error instanceof ClientError) {
      const errorMessage = stringifyMessage(content`
  The ${token.raw(
    api,
  )} GraphQL API responded unsuccessfully with the HTTP status ${`${error.response.status}`} and errors:

  ${outputToken.json(error.response.errors)}
      `)
      let mappedError: Error
      if (error.response.status < 500) {
        mappedError = new RequestClientError(errorMessage, error.response.status)
      } else {
        mappedError = new Abort(errorMessage)
      }
      mappedError.stack = error.stack
      throw mappedError
    } else {
      throw error
    }
  }
}
