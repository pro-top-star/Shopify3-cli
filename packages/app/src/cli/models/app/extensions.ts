import {ExtensionTypes} from '../../constants.js'
import {BaseConfigContents} from '../extensions/extensions.js'
import {FunctionConfigType, MetadataType} from '../extensions/functions.js'

export interface Extension {
  idEnvironmentVariableName: string
  localIdentifier: string
  configurationPath: string
  directory: string
  type: ExtensionTypes
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
}

export type UIExtension<TConfiguration extends BaseConfigContents = BaseConfigContents> = Extension & {
  configuration: TConfiguration
  entrySourceFilePath: string
  outputBundlePath: string
  devUUID: string
  preDeployValidation(): Promise<void>
  deployConfig(): Promise<{[key: string]: unknown}>
}
