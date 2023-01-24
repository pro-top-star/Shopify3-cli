import * as output from '../../../public/node/output.js'

interface OutputMock {
  output: () => string
  info: () => string
  debug: () => string
  success: () => string
  completed: () => string
  warn: () => string
  error: () => string
  clear: () => void
}

/**
 * Returns a set of functions to get the outputs ocurred during a test run.
 *
 * @returns An mock object with all the output functions.
 */ export function mockAndCaptureOutput(): OutputMock {
  return {
    output: () => (output.collectedLogs.output ?? []).join('\n'),
    info: () => (output.collectedLogs.info ?? []).join('\n'),
    debug: () => (output.collectedLogs.debug ?? []).join('\n'),
    success: () => (output.collectedLogs.success ?? []).join('\n'),
    completed: () => (output.collectedLogs.completed ?? []).join('\n'),
    warn: () => (output.collectedLogs.warn ?? []).join('\n'),
    error: () => (output.collectedLogs.error ?? []).join('\n'),
    clear: () => {
      output.clearCollectedLogs()
      // output.collectedLogs = {}
    },
  }
}
