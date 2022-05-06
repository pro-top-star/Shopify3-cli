// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import commondir from 'commondir'
import {relative} from 'pathe'

export * from 'pathe'

export {findUp} from 'find-up'
export {default as glob} from 'fast-glob'

/**
 * Given an absolute filesystem path, it makes it relative to
 * the current working directory. This is useful when logging paths
 * to allow the users to click on the file and let the OS open it
 * in the editor of choice.
 * @param path {string} Path to relativize
 * @returns {string} Relativized path.
 */
export function relativize(path: string): string {
  const result = commondir([path, process.cwd()])
  if (result === '/') {
    return path
  } else {
    return relative(process.cwd(), path)
  }
}
