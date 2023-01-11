import {getDependencyVersion} from '../../app/app.js'
import {createUIExtensionSpecification} from '../ui.js'
import {BaseUIExtensionSchema} from '../schemas.js'
import {error} from '@shopify/cli-kit'

const dependency = {name: '@shopify/retail-ui-extensions-react', version: '^0.38.0'}

const spec = createUIExtensionSpecification({
  identifier: 'pos_ui_extension',
  externalIdentifier: 'pos_ui',
  externalName: 'POS UI',
  surface: 'pos',
  dependency,
  partnersWebIdentifier: 'pos_ui_extension',
  schema: BaseUIExtensionSchema,
  deployConfig: async (_, directory) => {
    const result = await getDependencyVersion(dependency.name, directory)
    if (result === 'not_found') throw new error.Bug(`Dependency ${dependency.name} not found`)
    return {renderer_version: result?.version}
  },
  previewMessage: () => undefined,
})

export default spec
