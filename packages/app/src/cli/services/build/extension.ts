import {runGoExtensionsCLI} from '../../utilities/extensions/cli'
import {App, UIExtension} from '../../models/app/app'
import {extensionConfig} from '../../utilities/extensions/configuration'
import {error, yaml} from '@shopify/cli-kit'
import {Writable} from 'node:stream'

export interface ExtensionBuildOptions {
  /**
   * Standard output stream to send the output through.
   */
  stdout: Writable
  /**
   * Standard error stream to send the error output through.
   */
  stderr: Writable

  /**
   * Signal to abort the build process.
   */
  signal: error.AbortSignal

  /**
   * Overrides the default build directory.
   */
  buildDirectory?: string

  /**
   * The extension to be built.
   */
  extensions: UIExtension[]

  /**
   * The app that contains the extension.
   */
  app: App
}

/**
 * It builds the extensions.
 * @param options {ExtensionBuildOptions} Build options.
 */
export async function buildExtensions(options: ExtensionBuildOptions): Promise<void> {
  options.stdout.write(`Building extension...`)
  const stdin = yaml.encode(await extensionConfig(options))
  await runGoExtensionsCLI(['build', '-'], {
    cwd: options.app.directory,
    stdout: options.stdout,
    stderr: options.stderr,
    stdin,
  })
}
