/* eslint-disable @typescript-eslint/naming-convention */
// change to named imports
import {
  getFavicon,
  getStylesheet,
  getEmptyUrlHTML,
  getAuthErrorHTML,
  getMissingCodeHTML,
  getMissingStateHTML,
  getSuccessHTML,
  EmptyUrlString,
  MissingCodeString,
  MissingStateString,
} from './post-auth'
import {Abort, Bug} from '../error'
import * as output from '../output'
import http from 'http'
import url from 'url'

const ResponseTimeoutSeconds = 10

/**
 * It represents the result of a redirect.
 */
type RedirectCallback = (error: Error | undefined, state: string | undefined, code: string | undefined) => void

/**
 * Defines the interface of the options that
 * are used to instantiate a redirect listener.
 */
interface RedirectListenerOptions {
  host: string
  port: number
  callback: RedirectCallback
}
/**
 * When the authentication completes, Identity redirects
 * the user to a URL. In the case of the CLI, the redirect
 * is to localhost passing some parameters that are necessary
 * to continue the authentication. Because of that, we need
 * an HTTP server that runs and listens to the request.
 */
export class RedirectListener {
  private static createServer(callback: RedirectCallback): http.Server {
    return http.createServer(async (request, response) => {
      const requestUrl = request.url
      if (requestUrl === '/favicon.svg') {
        const faviconFile = await getFavicon()
        response.writeHead(200, {'Content-Type': 'image/svg+xml'}).end(faviconFile)
        return {}
      } else if (requestUrl === '/style.css') {
        const stylesheetFile = await getStylesheet()
        response.writeHead(200, {'Content-Type': 'text/css'}).end(stylesheetFile)
        return {}
      }

      const respond = async (file: Buffer | string, error?: Error, state?: string, code?: string) => {
        response.writeHead(200, {'Content-Type': 'text/html'}).end(file)
        return callback(error, state, code)
      }

      if (!requestUrl) {
        const file = await getEmptyUrlHTML()
        const err = new Bug(EmptyUrlString)
        return respond(file, err, undefined, undefined)
      }

      const queryObject = url.parse(requestUrl, true).query
      if (queryObject.error && queryObject.error_description) {
        const file = await getAuthErrorHTML()
        const err = new Abort(`${queryObject.error_description}`)
        return respond(file, err, undefined, undefined)
      }

      if (!queryObject.code) {
        const file = await getMissingCodeHTML()
        const err = new Bug(MissingCodeString)
        return respond(file, err, undefined, undefined)
      }

      if (!queryObject.state) {
        const file = await getMissingStateHTML()
        const err = new Bug(MissingStateString)
        return respond(file, err, undefined, undefined)
      }

      const file = await getSuccessHTML()
      return respond(file, undefined, `${queryObject.code}`, `${queryObject.state}`)
    })
  }

  port: number
  host: string
  server: http.Server

  constructor(options: RedirectListenerOptions) {
    this.port = options.port
    this.host = options.host
    this.server = RedirectListener.createServer(options.callback)
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.server.listen(this.port, this.host, undefined, () => {
        resolve()
      })
    })
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server.setTimeout(1)
      this.server.close((error) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }
}

export async function listenRedirect(host: string, port: number, url: string): Promise<{code: string; state: string}> {
  const result = await new Promise<{code: string; state: string}>((resolve, reject) => {
    const timeout = setTimeout(() => {
      const message = '\nAuto-open timed out. Open the login page: '
      output.info(output.content`${message}${output.token.link('Log in to Shopify Partners', url)}\n`)
    }, ResponseTimeoutSeconds * 1000)
    const redirectListener = new RedirectListener({
      host,
      port,
      callback: (error, code, state) => {
        clearTimeout(timeout)
        redirectListener.stop()
        if (error) {
          reject(error)
        } else {
          resolve({
            code: code as string,
            state: state as string,
          })
        }
      },
    })
    redirectListener.start()
  })
  return result
}
