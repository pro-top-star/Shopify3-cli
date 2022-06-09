import {runGoExtensionsCLI} from '../../utilities/extensions/cli'
import {
  blocks,
  extensionTypeCategory,
  ExtensionTypes,
  getExtensionOutputConfig,
  getUIExtensionRendererDependency,
  ThemeExtensionTypes,
  UIExtensionTypes,
  FunctionExtensionTypes,
} from '../../constants'
import {App} from '../../models/app/app'
import {error, file, git, path, string, template, ui, yaml, environment, dependency} from '@shopify/cli-kit'
import {fileURLToPath} from 'url'
import stream from 'node:stream'

async function getTemplatePath(name: string): Promise<string> {
  const templatePath = await path.findUp(`templates/${name}`, {
    cwd: path.dirname(fileURLToPath(import.meta.url)),
    type: 'directory',
  })
  if (templatePath) {
    return templatePath
  } else {
    throw new error.Bug(`Couldn't find the template ${name} in @shopify/app.`)
  }
}

interface ExtensionInitOptions<TExtensionTypes extends ExtensionTypes = ExtensionTypes> {
  name: string
  extensionType: TExtensionTypes
  app: App
  cloneUrl?: string
  language?: string
  extensionFlavor?: string
}

type FunctionExtensionInitOptions = ExtensionInitOptions<FunctionExtensionTypes>
type UIExtensionInitOptions = ExtensionInitOptions<UIExtensionTypes>
type ThemeExtensionInitOptions = ExtensionInitOptions<ThemeExtensionTypes>

async function extensionInit(options: ExtensionInitOptions) {
  switch (extensionTypeCategory(options.extensionType)) {
    case 'theme':
      await themeExtensionInit(options as ThemeExtensionInitOptions)
      break
    case 'function':
      await functionExtensionInit(options as FunctionExtensionInitOptions)
      break
    case 'ui':
      await uiExtensionInit(options as UIExtensionInitOptions)
      break
  }
}

async function themeExtensionInit({name, app, extensionType}: ThemeExtensionInitOptions) {
  const extensionDirectory = await ensureExtensionDirectoryExists({app, name})
  const templatePath = await getTemplatePath('theme-extension')
  await template.recursiveDirectoryCopy(templatePath, extensionDirectory, {name, extensionType})
}

async function uiExtensionInit({name, extensionType, app, extensionFlavor}: UIExtensionInitOptions) {
  const extensionDirectory = await ensureExtensionDirectoryExists({app, name})
  const list = new ui.Listr(
    [
      {
        title: 'Install additional dependencies',
        task: async (_, task) => {
          task.title = 'Installing additional dependencies...'
          const requiredDependencies = getRuntimeDependencies({extensionType})
          await dependency.addNPMDependenciesIfNeeded(requiredDependencies, {
            dependencyManager: app.dependencyManager,
            type: 'prod',
            directory: app.directory,
            stderr: new stream.Writable({
              write(chunk, encoding, next) {
                task.output = chunk.toString()
                next()
              },
            }),
            stdout: new stream.Writable({
              write(chunk, encoding, next) {
                task.output = chunk.toString()
                next()
              },
            }),
          })
          task.title = 'Dependencies installed'
        },
      },
      {
        title: `Scaffold ${getExtensionOutputConfig(extensionType).humanKey} extension`,
        task: async (_, task) => {
          task.title = `Scaffolding ${getExtensionOutputConfig(extensionType).humanKey} extension...`
          const stdin = yaml.encode({
            extensions: [
              {
                title: name,
                // Use the new templates
                type: `${extensionType}_next`,
                metafields: [],
                development: {
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  root_dir: '.',
                  template: extensionFlavor,
                },
              },
            ],
          })
          await runGoExtensionsCLI(['create', '-'], {
            cwd: extensionDirectory,
            stderr: new stream.Writable({
              write(chunk, encoding, next) {
                task.output = chunk.toString()
                next()
              },
            }),
            stdout: new stream.Writable({
              write(chunk, encoding, next) {
                task.output = chunk.toString()
                next()
              },
            }),
            stdin,
          })
          task.title = `${getExtensionOutputConfig(extensionType).humanKey} extension scaffolded`
        },
      },
    ],
    {rendererSilent: environment.local.isUnitTest()},
  )
  await list.run()
}

export function getRuntimeDependencies({extensionType}: Pick<UIExtensionInitOptions, 'extensionType'>): string[] {
  switch (extensionType) {
    case 'product_subscription':
    case 'checkout_ui_extension':
    case 'pos_ui_extension':
    case 'checkout_post_purchase': {
      const dependencies = ['react']
      const rendererDependency = getUIExtensionRendererDependency(extensionType)
      if (rendererDependency) {
        dependencies.push(rendererDependency)
      }
      return dependencies
    }
    case 'web_pixel_extension':
      return []
  }
}

async function functionExtensionInit(options: FunctionExtensionInitOptions) {
  const extensionDirectory = await ensureExtensionDirectoryExists(options)
  const url = options.cloneUrl || blocks.functions.defaultUrl
  await file.inTemporaryDirectory(async (tmpDir) => {
    const templateDownloadDir = path.join(tmpDir, 'download')

    const list = new ui.Listr(
      [
        {
          title: `Scaffolding ${getExtensionOutputConfig(options.extensionType).humanKey} extension...`,
          task: async (_, task) => {
            await file.mkdir(templateDownloadDir)
            await git.downloadRepository({repoUrl: url, destination: templateDownloadDir})
            const origin = path.join(templateDownloadDir, functionTemplatePath(options))
            await template.recursiveDirectoryCopy(origin, extensionDirectory, options)
            const configYamlPath = path.join(extensionDirectory, 'script.config.yml')
            if (await file.exists(configYamlPath)) {
              await file.remove(configYamlPath)
            }
            task.title = `${getExtensionOutputConfig(options.extensionType).humanKey} extension scaffolded`
          },
        },
      ],
      {rendererSilent: environment.local.isUnitTest()},
    )
    await list.run()
  })
}

function functionTemplatePath({extensionType, language}: FunctionExtensionInitOptions): string {
  const lang = language || blocks.functions.defaultLanguage
  switch (extensionType) {
    case 'product_discounts':
      return `discounts/${lang}/product-discounts/default`
    case 'order_discounts':
      return `discounts/${lang}/order-discounts/default`
    case 'shipping_discounts':
      return `discounts/${lang}/shipping-discounts/default`
    case 'payment_methods':
      return `checkout/${lang}/payment-methods/default`
    case 'shipping_rate_presenter':
      return `checkout/${lang}/shipping-rate-presenter/default`
  }
}

async function ensureExtensionDirectoryExists({name, app}: {name: string; app: App}) {
  const hyphenizedName = string.hyphenize(name)
  const extensionDirectory = path.join(app.directory, blocks.extensions.directoryName, hyphenizedName)
  if (await file.exists(extensionDirectory)) {
    throw new error.Abort(`Extension ${hyphenizedName} already exists!`)
  }
  await file.mkdir(extensionDirectory)
  return extensionDirectory
}

export default extensionInit
