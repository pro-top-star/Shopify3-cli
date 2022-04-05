// CLI
import {run, settings, flush} from '@oclif/core'
import Bugsnag from '@bugsnag/js'
import {error as kitError, environment} from '@shopify/cli-kit'

function runCLI() {
  if (environment.local.isDebug()) {
    settings.debug = true
  } else {
    Bugsnag.start({apiKey: '9e1e6889176fd0c795d5c659225e0fae', logger: null})
  }

  run(undefined, import.meta.url)
    .then(flush)
    .catch((error: Error): Promise<void | Error> => {
      if (error instanceof kitError.AbortSilent) {
        process.exit(0)
      }
      const bugsnagHandle = async (errorToReport: Error): Promise<Error> => {
        if (!settings.debug) {
          await new Promise((resolve, reject) => {
            Bugsnag.notify(errorToReport, undefined, resolve)
          })
        }
        return Promise.resolve(errorToReport)
      }
      const kitMapper = kitError.mapper
      const kitHandle = kitError.handler
      // eslint-disable-next-line promise/no-nesting
      return kitMapper(error)
        .then(bugsnagHandle)
        .then((error: Error) => {
          kitHandle(error)
        })
    })
}

export default runCLI
