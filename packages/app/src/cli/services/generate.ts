import {ensureGenerateEnvironment} from './environment.js'
import {fetchSpecifications} from './generate/fetch-extension-specifications.js'
import {AppInterface} from '../models/app/app.js'
import {load as loadApp} from '../models/app/loader.js'
import {GenericSpecification} from '../models/app/extensions.js'
import generateExtensionPrompt from '../prompts/generate/extension.js'
import metadata from '../metadata.js'
import generateExtensionService, {ExtensionFlavor} from '../services/generate/extension.js'
import {environment, error, output, path} from '@shopify/cli-kit'
import {PackageManager} from '@shopify/cli-kit/node/node-package-manager.js'
import {Config} from '@oclif/core'
import {ensureAuthenticatedPartners} from '@shopify/cli-kit/node/session'

export interface GenerateOptions {
  directory: string
  reset: boolean
  config: Config
  apiKey?: string
  type?: string
  template?: string
  name?: string
  cloneUrl?: string
}

async function generate(options: GenerateOptions) {
  const token = await ensureAuthenticatedPartners()
  const apiKey = await ensureGenerateEnvironment({...options, token})
  let specifications = await fetchSpecifications({token, apiKey, config: options.config})
  const app: AppInterface = await loadApp({directory: options.directory, specifications})

  // If the user has specified a type, we need to validate it
  const specification = findSpecification(options.type, specifications)
  const allExternalTypes = specifications.map((spec) => spec.externalIdentifier)

  if (options.type && !specification) {
    const isShopify = await environment.local.isShopify()
    const tryMsg = isShopify ? 'You might need to enable some beta flags on your Organization or App' : undefined
    throw new error.Abort(
      `Unknown extension type: ${options.type}.\nThe following extension types are supported: ${allExternalTypes.join(
        ', ',
      )}`,
      tryMsg,
    )
  }

  // Validate limits for selected type.
  // If no type is selected, filter out any types that have reached their limit
  if (specification) {
    const existing = app.extensionsForType(specification)
    const limit = specification.registrationLimit
    if (existing.length >= limit) {
      throw new error.Abort(
        'Invalid extension type',
        `You can only generate ${limit} extension(s) of type ${specification.externalIdentifier} per app`,
      )
    }
  } else {
    specifications = specifications.filter((spec) => app.extensionsForType(spec).length < spec.registrationLimit)
  }

  validateExtensionFlavor(specification, options.template)

  const promptAnswers = await generateExtensionPrompt({
    extensionType: specification?.identifier || options.type,
    name: options.name,
    extensionFlavor: options.template,
    directory: path.join(options.directory, 'extensions'),
    app,
    extensionSpecifications: specifications,
    reset: options.reset,
  })

  const {extensionType, extensionFlavor, name} = promptAnswers
  const selectedSpecification = findSpecification(extensionType, specifications)
  if (!selectedSpecification) {
    throw new error.Abort(`The following extension types are supported: ${allExternalTypes.join(', ')}`)
  }

  await metadata.addPublic(() => ({
    cmd_scaffold_template_flavor: extensionFlavor,
    cmd_scaffold_type: extensionType,
    cmd_scaffold_type_category: selectedSpecification.category(),
    cmd_scaffold_type_gated: selectedSpecification.gated,
    cmd_scaffold_used_prompts_for_type: extensionType !== options.type,
  }))

  const extensionDirectory = await generateExtensionService({
    name,
    extensionFlavor: extensionFlavor as ExtensionFlavor,
    specification: selectedSpecification,
    app,
    extensionType: selectedSpecification.identifier,
    cloneUrl: options.cloneUrl,
  })

  const formattedSuccessfulMessage = formatSuccessfulRunMessage(
    selectedSpecification,
    extensionDirectory,
    app.packageManager,
  )
  output.info(formattedSuccessfulMessage)
}

function findSpecification(type: string | undefined, specifications: GenericSpecification[]) {
  return specifications.find((spec) => spec.identifier === type || spec.externalIdentifier === type)
}

function validateExtensionFlavor(specification: GenericSpecification | undefined, flavor: string | undefined) {
  if (!flavor || !specification) return

  const possibleFlavors = specification.supportedFlavors.map((flavor) => flavor.value)
  if (!possibleFlavors.includes(flavor)) {
    throw new error.Abort(
      'Invalid template for extension type',
      `Expected template to be one of the following: ${possibleFlavors.join(', ')}.`,
    )
  }
}

function formatSuccessfulRunMessage(
  specification: GenericSpecification,
  extensionDirectory: string,
  depndencyManager: PackageManager,
): string {
  output.completed(`Your ${specification.externalName} extension was added to your project!`)

  const outputTokens = []
  outputTokens.push(
    output.content`\n  To find your extension, remember to ${output.token.genericShellCommand(
      output.content`cd ${output.token.path(extensionDirectory)}`,
    )}`.value,
  )

  if (specification.category() === 'ui' || specification.category() === 'theme') {
    outputTokens.push(
      output.content`  To preview your project, run ${output.token.packagejsonScript(depndencyManager, 'dev')}`.value,
    )
  }

  if (specification.helpURL) {
    outputTokens.push(
      output.content`  For more details, see the ${output.token.link('docs', specification.helpURL)} ✨`.value,
    )
  }

  return outputTokens.join('\n').concat('\n')
}

export default generate
