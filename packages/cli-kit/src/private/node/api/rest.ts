import {buildHeaders, httpsAgent, sanitizedHeadersOutput} from './headers.js'
import {content, debug} from '../../../output.js'
import nodeFetch from 'node-fetch'
import {AdminSession} from '@shopify/cli-kit/node/session'
import {performance} from 'perf_hooks'
import type {RequestInfo, RequestInit} from 'node-fetch'

export function restRequestBody<T>(requestBody?: T) {
  if (!requestBody) {
    return
  }
  return JSON.stringify(requestBody)
}

export function restRequestUrl(
  session: AdminSession,
  apiVersion: string,
  path: string,
  searchParams: {[name: string]: string} = {},
) {
  const url = new URL(
    isThemeAccessSession(session)
      ? `https://theme-kit-access.shopifyapps.com/cli/admin/api/${apiVersion}${path}.json`
      : `https://${session.storeFqdn}/admin/api/${apiVersion}${path}.json`,
  )
  Object.entries(searchParams).forEach(([name, value]) => url.searchParams.set(name, value))

  return url.toString()
}

export function restRequestHeaders(session: AdminSession) {
  const store = session.storeFqdn
  const token = session.token
  const headers = buildHeaders(session.token)

  if (isThemeAccessSession(session)) {
    headers['X-Shopify-Shop'] = store
    headers['X-Shopify-Access-Token'] = token
  }

  return headers
}

function isThemeAccessSession(session: AdminSession) {
  return session.token.startsWith('shptka_')
}

export type Response = ReturnType<typeof nodeFetch>
/**
 * An interface that abstracts way node-fetch. When Node has built-in
 * support for "fetch" in the standard library, we can drop the node-fetch
 * dependency from here.
 * Note that we are exposing types from "node-fetch". The reason being is that
 * they are consistent with the Web API so if we drop node-fetch in the future
 * it won't require changes from the callers.
 * @param url - This defines the resource that you wish to fetch.
 * @param init - An object containing any custom settings that you want to apply to the request
 * @returns A promise that resolves with the response.
 */
export async function fetch(url: RequestInfo, init?: RequestInit): Response {
  const response = await nodeFetch(url, init)
  return response
}

/**
 * A fetch function to use with Shopify services. The function ensures the right
 * TLS configuragion is used based on the environment in which the service is running
 * (e.g. spin)
 */
export async function shopifyFetch(url: RequestInfo, init?: RequestInit): Response {
  const options: RequestInit = {
    ...(init ?? {}),
    headers: {
      ...(await buildHeaders()),
      ...(init?.headers ?? {}),
    },
  }

  debug(content`
Sending ${options.method ?? 'GET'} request to URL ${url.toString()} and headers:
${sanitizedHeadersOutput((options?.headers ?? {}) as {[header: string]: string})}
`)
  const t0 = performance.now()
  const response = await nodeFetch(url, {...init, agent: await httpsAgent()})
  const t1 = performance.now()
  debug(`Request to ${url.toString()} completed with status ${response.status} in ${Math.round(t1 - t0)} ms`)
  return response
}
