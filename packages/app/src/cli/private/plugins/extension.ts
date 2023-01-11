import {UIExtensionSpec} from '../../models/extensions/ui.js'
import {FunctionSpec} from '../../models/extensions/functions.js'
import {HookReturnPerExtensionPlugin} from '../../public/plugins/extension.js'
import {plugins} from '@shopify/cli-kit'
import {Config} from '@oclif/core'
import {getArrayRejectingUndefined} from '@shopify/cli-kit/common/array'

export async function loadUIExtensionSpecificiationsFromPlugins(config: Config): Promise<UIExtensionSpec[]> {
  const hooks = await plugins.fanoutHooks<HookReturnPerExtensionPlugin, 'extension_specs'>(
    config,
    'extension_specs',
    {},
  )
  const specs = getArrayRejectingUndefined(Object.values(hooks)).flat()
  return specs
}

export async function loadFunctionSpecificationsFromPlugins(config: Config): Promise<FunctionSpec[]> {
  const hooks = await plugins.fanoutHooks<HookReturnPerExtensionPlugin, 'function_specs'>(config, 'function_specs', {})
  const specs = getArrayRejectingUndefined(Object.values(hooks)).flat()
  return specs
}
