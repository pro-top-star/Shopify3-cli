import mime from 'mime'
import {Request} from '@miniflare/core'
import connect from 'connect'
import {path} from '@shopify/cli-kit'
import {URL} from 'node:url'
import http from 'http'
import fs from 'fs'
import type {IncomingMessage} from 'http'

import type {NextHandleFunction} from 'connect'

import type {MiniOxygen} from './core'

interface AssetMiddlewareOptions {
  root?: string
  assets: string[]
}

function createAssetMiddleware({assets, root}: AssetMiddlewareOptions): NextHandleFunction {
  return (req, res, next) => {
    const filePath = path.join(root ?? process.cwd(), './dist/client', req.url!)
    if (assets.includes(filePath)) {
      const rs = fs.createReadStream(filePath)
      const {size} = fs.statSync(filePath)

      res.setHeader('Content-Type', mime.getType(filePath)!)
      res.setHeader('Content-Length', size)

      return rs.pipe(res)
    }

    return next()
  }
}

function createRequestMiddleware(mf: MiniOxygen): any {
  return async (req: any, res: any) => {
    let response
    let status = 500
    let headers = {}

    const request = new Request(urlFromRequest(req), {
      ...req,
    })

    try {
      response = await mf.dispatchFetch(request)
      status = response.status
      headers = response.headers
      res.writeHead(status, headers)

      if (response.body) {
        for await (const chunk of response.body) {
          if (chunk) res.write(chunk)
        }
      }

      res.end()
      // eslint-disable-next-line no-catch-all/no-catch-all
    } catch (error: any) {
      res.writeHead(500, {'Content-Type': 'text/plain; charset=UTF-8'})
      res.end(error.stack, 'utf8')
    }

    return response
  }
}

export async function createServer(mf: MiniOxygen, options: {assets: string[]; root?: string} = {assets: []}) {
  const app = connect()

  app.use(createAssetMiddleware(options))
  app.use(createRequestMiddleware(mf))

  const server = http.createServer(app)

  return server
}

function urlFromRequest(req: IncomingMessage) {
  const protocol = (req.socket as any).encrypted ? 'https' : 'http'
  const origin = `${protocol}://${req.headers.host ?? 'localhost'}`
  const url = new URL(req.url ?? '', origin)

  return url
}
