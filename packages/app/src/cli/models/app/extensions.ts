import {ExtensionTypes} from '../../constants.js'
import {BaseConfigContents} from '../extensions/extensions.js'
import {FunctionConfigType, MetadataType} from '../extensions/functions.js'
import {output} from '@shopify/cli-kit'
import {Result} from '@shopify/cli-kit/common/result'
import {DependencyVersion} from '@shopify/cli-kit/node/node-package-manager.js'

export type ExtensionCategory = 'ui' | 'function' | 'theme'

/**
 * Common interface for ExtensionSpec and FunctionSpec
 */
export interface GenericSpecification {
  identifier: string
  externalIdentifier: string
  externalName: string
  registrationLimit: number
  category: () => ExtensionCategory
}

export interface Extension {
  idEnvironmentVariableName: string
  localIdentifier: string
  configurationPath: string
  directory: string
  type: ExtensionTypes
  externalType: string
  graphQLType: string
  publishURL(options: {orgId: string; appId: string; extensionId?: string}): Promise<string>
}

export type FunctionExtension<
  TConfiguration extends FunctionConfigType = FunctionConfigType,
  TMetadata extends MetadataType = MetadataType,
> = Extension & {
  configuration: TConfiguration
  metadata: TMetadata
  buildWasmPath: () => string
  inputQueryPath: () => string
}

export type ThemeExtension<TConfiguration extends BaseConfigContents = BaseConfigContents> = Extension & {
  configuration: TConfiguration
  previewMessage(url: string, storeFqdn: string): output.TokenizedString | undefined
}

export type UIExtension<TConfiguration extends BaseConfigContents = BaseConfigContents> = Extension & {
  configuration: TConfiguration
  entrySourceFilePath?: string
  outputBundlePath: string
  devUUID: string
  surface: string
  dependency?: DependencyVersion
  getBundleExtensionStdinContent(): string
  validate(): Promise<Result<unknown, string>>
  preDeployValidation(): Promise<void>
  deployConfig(): Promise<{[key: string]: unknown}>
  previewMessage(url: string, storeFqdn: string): output.TokenizedString | undefined
}
