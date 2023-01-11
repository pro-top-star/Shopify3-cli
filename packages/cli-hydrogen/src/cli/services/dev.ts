import {checkHydrogenVersion} from './dev/check-version.js'
import {createServer, ViteDevServer} from 'vite'
import {error as kitError} from '@shopify/cli-kit'
import {reportAnalyticsEvent} from '@shopify/cli-kit/node/analytics'
import {Config} from '@oclif/core'

interface DevOptions {
  commandConfig: Config
  directory: string
  force: boolean
  host: boolean
  open: boolean
}

async function dev({commandConfig, directory, force, host, open}: DevOptions) {
  try {
    await checkHydrogenVersion(directory)

    const server = await createServer({
      root: directory,
      server: {
        open,
        force,
        host,
      },
    })
    await server.listen()
    server.printUrls()
    server.config.logger.info('')
    await reportAnalyticsEvent({config: commandConfig})
    await closeEvent(server)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const abortError = new kitError.Abort(error.message)
    abortError.stack = error.stack
    throw abortError
  }
}

function closeEvent(server: ViteDevServer): Promise<void> {
  return new Promise((resolve) => {
    server.ws.on('close', () => {
      return resolve()
    })
  })
}

export default dev
