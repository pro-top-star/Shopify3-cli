/* eslint-disable require-atomic-updates */
import {bundleUIAndBuildFunctionExtensions} from './deploy/bundle'
import {uploadFunctionExtensions, uploadUIExtensionsBundle} from './deploy/upload'

import {ensureDeployEnvironment} from './environment'
import {fetchAppExtensionRegistrations} from './dev/fetch'
import {
  App,
  Extension,
  getUIExtensionRendererVersion,
  hasExtensions,
  Identifiers,
  UIExtension,
  updateAppIdentifiers,
} from '../models/app/app'
import {isFunctionExtensionType, isThemeExtensionType, isUiExtensionType, UIExtensionTypes} from '../constants'
import {loadLocalesConfig} from '../utilities/extensions/locales-configuration'
import {validateExtensions} from '../validators/extensions'
import {api, error, path, output, temporary, file} from '@shopify/cli-kit'
import {OrganizationApp} from 'cli/models/organization'
import {AllAppExtensionRegistrationsQuerySchema} from '@shopify/cli-kit/src/api/graphql'

interface DeployOptions {
  /** The app to be built and uploaded */
  app: App

  /** If true, ignore any cached appId or extensionId */
  reset: boolean
}

export const deploy = async (options: DeployOptions) => {
  if (!hasExtensions(options.app)) {
    output.newline()
    output.info(`No extensions to deploy to Shopify Partners yet.`)
    return
  }

  // eslint-disable-next-line prefer-const
  let {app, identifiers, partnersApp, partnersOrganizationId, token} = await ensureDeployEnvironment(options)
  const apiKey = identifiers.app

  output.newline()
  output.info(`Deploying your work to Shopify Partners. It will be part of ${partnersApp.title}`)
  output.newline()

  const extensions = await Promise.all(
    options.app.extensions.ui.map(async (extension) => {
      return {
        uuid: identifiers.extensions[extension.localIdentifier],
        config: JSON.stringify(await configFor(extension, app)),
        context: '',
      }
    }),
  )

  const themeExtension = options.app.extensions.theme[0]
  if (themeExtension) {
    const files: {[key: string]: string} = {}
    const themeFiles = await path.glob(path.join(themeExtension.directory, '*/*'))
    await Promise.all(
      themeFiles.map(async (filepath) => {
        const relativePath = path.relative(themeExtension.directory, filepath)
        const dirname = path.dirname(filepath)
        const encoding = dirname === 'assets' ? 'binary' : 'utf8'
        const fileContents = await file.read(filepath, {encoding})
        files[relativePath] = Buffer.from(fileContents).toString('base64')
      }),
    )

    const themeExtensionInput: api.graphql.ExtensionUpdateDraftInput = {
      apiKey,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      config: JSON.stringify({theme_extension: {files}}),
      context: undefined,
      registrationId: identifiers.extensionIds[themeExtension.localIdentifier],
    }
    const mutation = api.graphql.ExtensionUpdateDraftMutation
    const result: api.graphql.ExtensionUpdateSchema = await api.partners.request(mutation, token, themeExtensionInput)
    if (
      result.extensionUpdateDraft &&
      result.extensionUpdateDraft.userErrors &&
      result.extensionUpdateDraft.userErrors.length > 0
    ) {
      const errors = result.extensionUpdateDraft.userErrors.map((error) => error.message).join(', ')
      throw new error.Abort(errors)
    }
  }

  await temporary.directory(async (tmpDir) => {
    const bundlePath = path.join(tmpDir, `bundle.zip`)
    await file.mkdir(path.dirname(bundlePath))
    const bundle = app.extensions.ui.length !== 0
    await bundleUIAndBuildFunctionExtensions({app, bundlePath, identifiers, bundle})

    output.newline()
    output.info(`Running validation…`)

    await validateExtensions(app)

    output.newline()
    output.info(`Pushing your code to Shopify…`)
    output.newline()

    if (bundle) {
      /**
       * The bundles only support UI extensions for now so we only need bundle and upload
       * the bundle if the app has UI extensions.
       */
      await uploadUIExtensionsBundle({apiKey, bundlePath, extensions, token})
    }

    identifiers = await uploadFunctionExtensions(app.extensions.function, {identifiers, token})
    app = await updateAppIdentifiers({app, identifiers, environmentType: 'production'})

    output.success('Deployed to Shopify')

    const registrations = await fetchAppExtensionRegistrations({token, apiKey: identifiers.app})

    outputCompletionMessage({app, partnersApp, partnersOrganizationId, identifiers, registrations})
  })
}

function outputCompletionMessage({
  app,
  partnersApp,
  partnersOrganizationId,
  identifiers,
  registrations,
}: {
  app: App
  partnersApp: Omit<OrganizationApp, 'apiSecretKeys' | 'apiKey'>
  partnersOrganizationId: string
  identifiers: Identifiers
  registrations: AllAppExtensionRegistrationsQuerySchema
}) {
  output.newline()
  output.info('  Summary:')
  const outputDeployedButNotLiveMessage = (extension: Extension) => {
    output.info(output.content`    · ${extension.localIdentifier} is deployed to Shopify but not yet live`)
  }
  const outputDeployedAndLivedMessage = (extension: Extension) => {
    output.info(output.content`    · ${extension.localIdentifier} is live`)
  }
  app.extensions.ui.forEach(outputDeployedButNotLiveMessage)
  app.extensions.theme.forEach(outputDeployedButNotLiveMessage)
  app.extensions.function.forEach(outputDeployedAndLivedMessage)

  output.newline()
  output.info('  Next steps in Shopify Partners:')
  const outputNextStep = (extension: Extension) => {
    const extensionId =
      registrations.app.extensionRegistrations.find((registration) => {
        return registration.uuid === identifiers.extensions[extension.localIdentifier]
      })?.id ?? ''
    output.info(
      output.content`    · Publish ${output.token.link(
        extension.localIdentifier,
        getExtensionPublishURL({extension, partnersApp, partnersOrganizationId, extensionId}),
      )}`,
    )
  }
  app.extensions.ui.forEach(outputNextStep)
  app.extensions.theme.forEach(outputNextStep)
  app.extensions.function.forEach(outputNextStep)
}

async function configFor(extension: UIExtension, app: App) {
  const type = extension.type as UIExtensionTypes
  switch (extension.type as UIExtensionTypes) {
    case 'checkout_post_purchase':
      return {metafields: extension.configuration.metafields}
    case 'pos_ui_extension':
    case 'product_subscription':
      // eslint-disable-next-line @typescript-eslint/naming-convention
      return {renderer_version: getUIExtensionRendererVersion(type, app)?.version}
    case 'checkout_ui_extension': {
      return {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        extension_points: extension.configuration.extensionPoints,
        capabilities: extension.configuration.capabilities,
        metafields: extension.configuration.metafields,
        name: extension.configuration.name,
        localization: await loadLocalesConfig(extension.directory),
      }
    }
    case 'web_pixel_extension': {
      return {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        runtime_context: extension.configuration.runtimeContext,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        runtime_configuration_definition: extension.configuration.configuration,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        config_version: extension.configuration.version,
      }
    }
  }
}

function getExtensionPublishURL({
  extension,
  partnersApp,
  partnersOrganizationId,
  extensionId,
}: {
  extension: Extension
  partnersApp: Omit<OrganizationApp, 'apiSecretKeys' | 'apiKey'>
  partnersOrganizationId: string
  extensionId: string
}): string {
  if (isUiExtensionType(extension.type)) {
    /**
     * The source of truth for UI extensions' slugs is the client-side
     * Partners' React application:
     * https://github.com/Shopify/partners/tree/master/app/assets/javascripts/sections/apps/app-extensions/extensions
     */
    let pathComponent: string
    switch (extension.type as UIExtensionTypes) {
      case 'checkout_ui_extension':
      case 'pos_ui_extension':
      case 'product_subscription':
        pathComponent = extension.type
        break
      case 'checkout_post_purchase':
        pathComponent = 'post_purchase'
        break
      case 'web_pixel_extension':
        pathComponent = 'beacon_extension'
        break
    }
    return `https://partners.shopify.com/${partnersOrganizationId}/apps/${partnersApp.id}/extensions/${pathComponent}/${extensionId}`
  } else if (isFunctionExtensionType(extension.type)) {
    return `https://partners.shopify.com/${partnersOrganizationId}/apps/${partnersApp.id}/extensions`
  } else if (isThemeExtensionType(extension.type)) {
    return `https://partners.shopify.com/${partnersOrganizationId}/apps/${partnersApp.id}/extensions/theme_app_extension/${extensionId}`
  } else {
    return ''
  }
}
