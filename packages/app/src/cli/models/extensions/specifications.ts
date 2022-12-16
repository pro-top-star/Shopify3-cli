import {UIExtensionSpec} from './ui.js'
import {FunctionSpec} from './functions.js'
import {ThemeExtensionSpec} from './theme.js'
import {os, path} from '@shopify/cli-kit'
import {memoize} from 'lodash-es'
import {fileURLToPath} from 'url'

export async function allUISpecifications(): Promise<UIExtensionSpec[]> {
  return memLoadSpecs('ui-specifications')
}

export async function allFunctionSpecifications(): Promise<FunctionSpec[]> {
  return memLoadSpecs('function-specifications')
}

export async function allThemeSpecifications(): Promise<ThemeExtensionSpec[]> {
  return memLoadSpecs('theme-specifications')
}

const memLoadSpecs = memoize(loadSpecs)

async function loadSpecs(directoryName: string) {
  const url = path.join(path.dirname(fileURLToPath(import.meta.url)), directoryName)
  /**
   * When running tests, "await import('.../spec..ts')" is handled by Vitest which does
   * transform the TS module into a JS one before loading it. Hence the inclusion of .ts
   * in the list of files.
   */
  let files = (await path.glob(path.join(url, '*'))).filter((filePath) => {
    const isTest = filePath.endsWith('.test.ts')
    const isTypescript = filePath.endsWith('.ts')
    const isDeclaration = filePath.endsWith('.d.ts')
    const isJS = filePath.endsWith('.js')
    return isJS || (isTypescript && !isDeclaration && !isTest)
  })

  // From Node 18, all windows paths must start with file://
  const {platform} = os.platformAndArch()
  if (platform === 'windows') {
    files = files.map((file) => `file://${file}`)
  }

  const promises = files.map((file) => import(file))
  const modules = await Promise.all(promises)
  const specs = modules.map((module) => module.default)
  return specs
}
