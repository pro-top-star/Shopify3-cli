import {FanoutHookFunction} from '../plugins.js'
import {ExtendableError} from '../error.js'
import {JsonMap} from '../json.js'

export type ExtensionErrorType = 'unknown'
export class ExtensionError extends ExtendableError {
  type: ExtensionErrorType
  constructor(type: ExtensionErrorType, message?: string) {
    super(message)
    this.type = type
  }
}

/**
 * Extension Plugins types
 *
 * Any plugin that provides extension definitions should implement `defineExtensionSpec` and `defineExtensionPoint`
 */
export interface HookReturnPerExtensionPlugin {
  extension_spec: {
    options: {[key: string]: never}
    pluginReturns: {
      [pluginName: string]: JsonMap
    }
  }
  extension_point: {
    options: {[key: string]: never}
    pluginReturns: {
      [pluginName: string]: JsonMap
    }
  }
}

export type ExtensionSpecFunction = FanoutHookFunction<'extension_spec', ''>
export type ExtensionPointFunction = FanoutHookFunction<'extension_point', ''>

export const defineExtensionSpec = (input: JsonMap): ExtensionSpecFunction => {
  return async () => input
}

export const defineExtensionPoint = (input: JsonMap): ExtensionPointFunction => {
  return async () => input
}
