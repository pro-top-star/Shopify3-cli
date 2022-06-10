import {
  extensions,
  ExtensionTypes,
  functionExtensions,
  getExtensionOutputConfig,
  themeExtensions,
  uiExtensions,
} from '../../constants'
import {haiku, ui, environment} from '@shopify/cli-kit'

interface ScaffoldExtensionOptions {
  name?: string
  extensionType?: string
  extensionTypesAlreadyAtQuota: string[]
  extensionFlavor?: string
  extensionLanguage?: string
}

interface ScaffoldExtensionOutput {
  name: string
  extensionType: ExtensionTypes
  extensionFlavor?: string
  extensionLanguage?: string
}

export const extensionFlavorQuestion = (): ui.Question => {
  return {
    type: 'select',
    name: 'extensionFlavor',
    message: 'Choose a starting template for your extension',
    choices: [
      {name: 'React', value: 'react'},
      {name: 'vanilla JavaScript', value: 'vanilla-js'},
    ],
    default: 'react',
  }
}

export const extensionLanguageQuestion = (): ui.Question => {
  return {
    type: 'select',
    name: 'extensionLanguage',
    message: 'Choose a language for your extension',
    choices: [
      {name: 'Wasm', value: 'wasm'},
      {name: 'Rust', value: 'rust'},
    ],
    default: 'wasm',
  }
}

const scaffoldExtensionPrompt = async (
  options: ScaffoldExtensionOptions,
  prompt = ui.prompt,
): Promise<ScaffoldExtensionOutput> => {
  const questions: ui.Question[] = []
  const isShopify = await environment.local.isShopify()
  const supportedExtensions = isShopify ? extensions.types : extensions.publicTypes
  if (!options.extensionType) {
    let relevantExtensionTypes = supportedExtensions.filter(
      (type) => !options.extensionTypesAlreadyAtQuota.includes(type),
    )
    if (options.extensionFlavor) {
      relevantExtensionTypes = relevantExtensionTypes.filter(isUiExtensionType)
    }
    questions.push({
      type: 'select',
      name: 'extensionType',
      message: 'Type of extension?',
      choices: relevantExtensionTypes
        .map((type) => ({
          name: getExtensionOutputConfig(type).humanKey,
          value: type,
        }))
        .sort(extensionTypeChoiceSorterByGroupAndName),
    })
  }
  if (!options.name) {
    questions.push({
      type: 'input',
      name: 'name',
      message: "Your extension's working name?",
      default: haiku.generate('ext'),
    })
  }
  let promptOutput: ScaffoldExtensionOutput = await prompt(questions)
  if (!options.extensionFlavor && isUiExtensionType({...options, ...promptOutput}.extensionType)) {
    promptOutput = {
      ...promptOutput,
      extensionFlavor: (
        (await prompt([
          extensionFlavorQuestion(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ])) as any
      ).extensionFlavor,
    }
  }
  if (!options.extensionLanguage && isFunctionExtensionType({...options, ...promptOutput}.extensionType)) {
    promptOutput = {
      ...promptOutput,
      extensionLanguage: (
        (await prompt([
          extensionLanguageQuestion(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ])) as any
      ).extensionLanguage,
    }
  }
  return {...options, ...promptOutput}
}

/**
 * Sorting method for prompt choices that sort alphabetically extensions showing first the UI ones
 * and latest the function ones
 */
export const extensionTypeChoiceSorterByGroupAndName = (
  c1: {name: string; value: string},
  c2: {name: string; value: string},
) => {
  const c1ExtensiontyCategoryPosition = extensiontypeCategoryPosition(c1.value)
  const c2ExtensiontyCategoryPosition = extensiontypeCategoryPosition(c2.value)

  if (c1ExtensiontyCategoryPosition === c2ExtensiontyCategoryPosition) {
    return c1.name.localeCompare(c2.name)
  } else {
    return c1ExtensiontyCategoryPosition < c2ExtensiontyCategoryPosition ? -1 : 1
  }
}

/**
 * It maps an extension category to a numeric value.
 * @param extensionType {string} The extension type which will be resolved to its category.
 * @returns The numeric value of the extension category.
 */
const extensiontypeCategoryPosition = (extensionType: string): number => {
  if (includes(uiExtensions.types, extensionType) || includes(themeExtensions.types, extensionType)) {
    return 0
  } else if (includes(functionExtensions.types, extensionType)) {
    return 1
  } else {
    return Number.MAX_VALUE
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
function includes<T extends U, U>(coll: ReadonlyArray<T>, el: U): el is T {
  return coll.includes(el as T)
}

function isUiExtensionType(extensionType: string) {
  return (uiExtensions.types as ReadonlyArray<string>).includes(extensionType)
}

function isFunctionExtensionType(extensionType: string) {
  return (functionExtensions.types as ReadonlyArray<string>).includes(extensionType)
}

export default scaffoldExtensionPrompt
