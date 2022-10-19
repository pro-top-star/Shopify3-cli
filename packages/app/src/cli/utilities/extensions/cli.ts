import {getBinaryPathOrDownload} from './binary.js'
import metadata from '../../metadata.js'
import {environment, error, path, system} from '@shopify/cli-kit'
import {fileURLToPath} from 'url'
import {platform} from 'node:os'

const NodeExtensionsCLINotFoundError = () => {
  return new error.Bug(`Couldn't find the shopify-cli-extensions Node binary`)
}

/**
 * This function runs the extensions' CLI and has support for running
 * it through its source code when the SHOPIFY_USE_EXTENSIONS_CLI_SOURCES=1 variable
 * is set.
 * @param args - Arguments to pass to the CLI
 * @param options - Options to configure the process execution.
 */
export async function runGoExtensionsCLI(args: string[], options: system.WritableExecOptions = {}) {
  const stdout = options.stdout || {write: () => {}}
  if (environment.local.isDevelopment()) {
    await metadata.addPublic(() => ({cmd_extensions_binary_from_source: true}))
    const extensionsGoCliDirectory = (await path.findUp('packages/ui-extensions-go-cli/', {
      type: 'directory',
      cwd: path.moduleDirectory(import.meta.url),
    })) as string

    stdout.write(`Using extensions CLI from ${extensionsGoCliDirectory}`)
    try {
      if (environment.local.isDebugGoBinary()) {
        await system.exec('sh', [path.join(extensionsGoCliDirectory, 'init-debug-session')].concat(args), options)
      } else {
        const isWindows = platform() === 'win32'
        const extension = isWindows ? '.exe' : ''
        await system.exec(path.join(extensionsGoCliDirectory, `shopify-extensions${extension}`), args, options)
      }
    } catch {
      throw new error.AbortSilent()
    }
  } else {
    await metadata.addPublic(() => ({cmd_extensions_binary_from_source: false}))
    const binaryPath = await getBinaryPathOrDownload()
    await system.exec(binaryPath, [...args], options)
  }
}

/**
 * The extensions' CLI is comprised by a Go and Node executable. The latter is distributed
 * as an NPM package `@shopify/shopify-cli-extensions`, which is a dependency of `@shopify/app`.
 * This method looks up the binary under node_modules/.bin and returns its path.
 * @returns A promise that resolves with the path to the Node executable.
 */
export async function nodeExtensionsCLIPath(): Promise<string> {
  const cwd = path.dirname(fileURLToPath(import.meta.url))
  if (environment.local.isDevelopment()) {
    return (await path.findUp('packages/ui-extensions-cli/bin/cli.js', {
      type: 'file',
      cwd,
    })) as string
  } else {
    const executablePath = await path.findUp('node_modules/@shopify/shopify-cli-extensions/dist/cli.js', {
      type: 'file',
      cwd,
      allowSymlinks: true,
    })
    if (!executablePath) {
      throw NodeExtensionsCLINotFoundError()
    }
    return executablePath
  }
}
