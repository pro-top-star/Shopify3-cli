import {errorHandler, registerCleanBugsnagErrorsFromWithinPlugins} from './error-handler.js'
import {isDebug} from '../environment/local.js'
import {addPublic} from '../metadata.js'
import {hashString} from '../string.js'
import {Command, Interfaces} from '@oclif/core'

// eslint-disable-next-line import/no-anonymous-default-export
export default abstract class extends Command {
  async catch(error: Error & {exitCode?: number | undefined}) {
    errorHandler(error, this.config)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async init(): Promise<any> {
    if (!isDebug()) {
      // This function runs just prior to `run`
      registerCleanBugsnagErrorsFromWithinPlugins(this.config.plugins)
    }
    return super.init()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async parse<TFlags extends {path?: string; verbose?: boolean}, TArgs extends {[name: string]: any}>(
    options?: Interfaces.Input<TFlags> | undefined,
    argv?: string[] | undefined,
  ): Promise<Interfaces.ParserOutput<TFlags, TArgs>> {
    const result = await super.parse<TFlags, TArgs>(options, argv)
    addFromParsedFlags(result.flags)
    return result
  }
}

export function addFromParsedFlags(flags: {path?: string; verbose?: boolean}) {
  addPublic({
    cmd_verbose: flags.verbose,
    cmd_path_override: flags.path !== undefined,
    cmd_path_override_hash: flags.path === undefined ? undefined : hashString(flags.path),
  })
}
