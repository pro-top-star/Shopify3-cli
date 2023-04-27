import {buildFunctionExtension, buildUIExtensions} from '../build/extension.js'
import {AppInterface} from '../../models/app/app.js'
import {Identifiers} from '../../models/app/identifiers.js'
import {bundleThemeExtensions} from '../extensions/bundle.js'
import {zip} from '@shopify/cli-kit/node/archiver'
import {renderConcurrent} from '@shopify/cli-kit/node/ui'
import {AbortSignal} from '@shopify/cli-kit/node/abort'
import {inTemporaryDirectory, mkdirSync, touchFile} from '@shopify/cli-kit/node/fs'
import {joinPath, basename} from '@shopify/cli-kit/node/path'
import {useThemebundling} from '@shopify/cli-kit/node/context/local'
import {outputInfo, outputNewline} from '@shopify/cli-kit/node/output'
import {Writable} from 'stream'

interface BundleExtensionsOptions {
  app: AppInterface
  bundleRootPath: string
  identifiers: Identifiers
}

export async function bundleExtensions(options: BundleExtensionsOptions) {
  const bundleTheme = useThemebundling() && options.app.extensions.theme.length !== 0
  const bundleUI = options.app.extensions.ui.length !== 0
  if (!bundleTheme && !bundleUI) return

  outputNewline()
  outputInfo(`Preparing UI and Theme extensions`)
  return inTemporaryDirectory(async (tmpDir) => {
    const bundleDirectory = joinPath(tmpDir, 'bundle')
    mkdirSync(bundleDirectory)
    await touchFile(joinPath(bundleDirectory, '.shopify'))

    await renderConcurrent({
      processes: [
        {
          prefix: 'theme_extensions',
          action: async (stdout: Writable, stderr: Writable, signal: AbortSignal) => {
            await bundleThemeExtensions({
              app: options.app,
              extensions: options.app.extensions.theme.map((themeExtension) => {
                const extensionId = options.identifiers.extensions[themeExtension.localIdentifier]!
                themeExtension.outputBundlePath = joinPath(bundleDirectory, extensionId)
                return themeExtension
              }),
              stdout,
              stderr,
              signal,
            })
          },
        },
        ...(await buildUIExtensions({
          app: {
            ...options.app,
            extensions: {
              ...options.app.extensions,
              ui: options.app.extensions.ui.map((uiExtension) => {
                const extensionId = options.identifiers.extensions[uiExtension.localIdentifier]!
                uiExtension.outputBundlePath = joinPath(
                  bundleDirectory,
                  extensionId,
                  basename(uiExtension.outputBundlePath),
                )
                return uiExtension
              }),
            },
          },
        })),
      ],
      showTimestamps: false,
    })

    const bundlePath = joinPath(options.bundleRootPath, `bundle.zip`)
    await zip({
      inputDirectory: bundleDirectory,
      outputZipPath: bundlePath,
    })
    return bundlePath
  })
}

export async function buildFunctions(app: AppInterface) {
  outputNewline()
  outputInfo(`Preparing Function extensions`)
  await renderConcurrent({
    processes: app.extensions.function.map((functionExtension) => {
      return {
        prefix: functionExtension.localIdentifier,
        action: async (stdout: Writable, stderr: Writable, signal: AbortSignal) => {
          await buildFunctionExtension(functionExtension, {stdout, stderr, signal, app})
        },
      }
    }),
    showTimestamps: false,
  })
}
