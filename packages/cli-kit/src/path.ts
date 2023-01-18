import {OverloadParameters} from './public/common/typing/overloaded-parameters.js'
import commondir from 'commondir'
import {relative, dirname, join, normalize, resolve, basename, extname, isAbsolute, parse} from 'pathe'
import {findUp as internalFindUp} from 'find-up'
import {fileURLToPath} from 'url'
// eslint-disable-next-line node/prefer-global/url
import type {URL} from 'url'
import type {Pattern, Options} from 'fast-glob'

export {join, relative, dirname, normalize, resolve, basename, extname, isAbsolute, parse}

export async function glob(pattern: Pattern | Pattern[], options?: Options): Promise<string[]> {
  const {default: fastGlob} = await import('fast-glob')
  let overridenOptions = options
  if (options?.dot == null) {
    overridenOptions = {...options, dot: true}
  }
  return fastGlob(pattern, overridenOptions)
}
export {pathToFileURL} from 'url'

export async function findUp(
  matcher: OverloadParameters<typeof internalFindUp>[0],
  options: OverloadParameters<typeof internalFindUp>[1],
): ReturnType<typeof internalFindUp> {
  // findUp has odd typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const got = await internalFindUp(matcher as any, options)
  return got ? normalize(got) : undefined
}

/**
 * Given an absolute filesystem path, it makes it relative to
 * the current working directory. This is useful when logging paths
 * to allow the users to click on the file and let the OS open it
 * in the editor of choice.
 * @param path - Path to relativize
 * @returns Relativized path.
 */
export function relativize(path: string, cwd: string = process.cwd()): string {
  const result = commondir([path, cwd])
  const relativePath = relative(cwd, path)
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const relativeComponents = relativePath.split('/').filter((component) => component === '..').length
  if (result === '/' || relativePath === '' || relativeComponents > 2) {
    return path
  } else {
    return relativePath
  }
}

/**
 * Given a module's import.meta.url it returns the directory containing the module.
 * @param moduleURL - The value of import.meta.url in the context of the caller module.
 * @returns The path to the directory containing the caller module.
 */
export function moduleDirectory(moduleURL: string | URL): string {
  return dirname(fileURLToPath(moduleURL))
}
