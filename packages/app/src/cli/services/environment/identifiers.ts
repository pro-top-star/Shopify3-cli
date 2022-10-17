import {ensureExtensionsIds} from './identifiers-extensions.js'
import {AppInterface} from '../../models/app/app.js'
import {Identifiers} from '../../models/app/identifiers.js'
import {fetchAppExtensionRegistrations} from '../dev/fetch.js'
import {output, error} from '@shopify/cli-kit'
import {PackageManager} from '@shopify/cli-kit/node/node-package-manager'

export interface EnsureDeploymentIdsPresenceOptions {
  app: AppInterface
  token: string
  appId: string
  appName: string
  envIdentifiers: Partial<Identifiers>
}

export interface RemoteRegistration {
  uuid: string
  type: string
  id: string
  title: string
}

export type MatchingError = 'pending-remote' | 'invalid-environment' | 'user-cancelled'

export async function ensureDeploymentIdsPresence(options: EnsureDeploymentIdsPresenceOptions) {
  // We need local extensions to deploy
  if (!options.app.hasExtensions()) return {app: options.appId, extensions: {}, extensionIds: {}}
  const validIdentifiers = options.envIdentifiers.extensions ?? {}
  const functionLocalIdentifiers = Object.fromEntries(
    options.app.extensions.function
      .map((extension) => extension.localIdentifier)
      .map((extensionIdentifier) => {
        return validIdentifiers[extensionIdentifier]
          ? [extensionIdentifier, validIdentifiers[extensionIdentifier]]
          : undefined
      })
      .filter((entry) => entry !== undefined) as string[][],
  )

  const remoteSpecifications = await fetchAppExtensionRegistrations({token: options.token, apiKey: options.appId})

  // PENDING: Ensure Functions IDs

  const extensions = await ensureExtensionsIds(options, remoteSpecifications.app.extensionRegistrations)
  if (extensions.isErr()) return handleIdsError(extensions.error, options.appName, options.app.packageManager)

  return {
    app: options.appId,
    extensions: {...extensions.value.extensions, ...functionLocalIdentifiers},
    extensionIds: extensions.value.extensionIds,
  }
}

function handleIdsError(errorType: MatchingError, appName: string, packageManager: PackageManager) {
  switch (errorType) {
    case 'pending-remote':
    case 'invalid-environment':
      throw new error.Abort(
        `Deployment failed because this local project doesn't seem to match the app "${appName}" in Shopify Partners.`,
        `If you didn't intend to select this app, run ${
          output.content`${output.token.packagejsonScript(packageManager, 'deploy', '--reset')}`.value
        }
• If this is the app you intended, check your local project and make sure
  it contains the same number and types of extensions as the Shopify app
  you've selected. You may need to generate missing extensions.`,
      )
    case 'user-cancelled':
      throw new error.AbortSilent()
  }
}
