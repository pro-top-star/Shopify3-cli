import {BaseExtensionSchema, ExtensionPointSchema, ZodSchemaType} from './schemas.js'
import {ExtensionPointSpec} from './extension-points.js'
import {allExtensionSpecifications} from './specifications.js'
import {AppInterface} from '../app/app.js'
import {bundleExtension} from '../../services/extensions/bundle.js'
import {ExtensionIdentifier, ThemeExtension, UIExtension} from '../app/extensions.js'
import {id, path, schema, api, output, environment, string} from '@shopify/cli-kit'
import {Writable} from 'node:stream'

// Base config type that all config schemas must extend.
export type BaseConfigContents = schema.define.infer<typeof BaseExtensionSchema>
export type ExtensionPointContents = schema.define.infer<typeof ExtensionPointSchema>

/**
 * Extension specification with all the needed properties and methods to load an extension.
 */
export interface ExtensionSpec<TConfiguration extends BaseConfigContents = BaseConfigContents>
  extends ExtensionIdentifier {
  identifier: string
  externalIdentifier: string
  externalName: string
  partnersWebIdentifier: string
  surface: string
  showInCLIHelp: boolean
  dependency?: {name: string; version: string}
  templatePath?: string
  graphQLType?: string
  schema: ZodSchemaType<TConfiguration>
  deployConfig?: (config: TConfiguration, directory: string) => Promise<{[key: string]: unknown}>
  preDeployValidation?: (config: TConfiguration) => Promise<void>
  resourceUrl?: (config: TConfiguration) => string
  previewMessage?: (
    host: string,
    uuid: string,
    config: TConfiguration,
    storeFqdn: string,
  ) => output.TokenizedString | undefined
}

/**
 * Class that represents an instance of a local extension
 * Before creating this class we've validated that:
 * - There is a spec for this type of extension
 * - The Schema for that spec is followed by the extension config toml file
 * - We were able to find an entry point file for that extension
 *
 * It supports extension points, making this Class compatible with both new ui-extension
 * and legacy extension types. Extension points are optional and this class will handle them if present.
 *
 * This class holds the public interface to interact with extensions
 */
export class ExtensionInstance<TConfiguration extends BaseConfigContents = BaseConfigContents>
  implements UIExtension<TConfiguration>, ThemeExtension<TConfiguration>
{
  entrySourceFilePath: string
  outputBundlePath: string
  devUUID: string
  localIdentifier: string
  idEnvironmentVariableName: string
  directory: string
  configuration: TConfiguration
  configurationPath: string

  private specification: ExtensionSpec
  private extensionPointSpecs?: ExtensionPointSpec[]
  private remoteSpecification?: api.graphql.RemoteSpecification

  get graphQLType() {
    return (this.specification.graphQLType ?? this.specification.identifier).toUpperCase()
  }

  get identifier() {
    return this.specification.identifier
  }

  get type() {
    return this.specification.identifier
  }

  get humanName() {
    return this.remoteSpecification?.externalName ?? this.specification.externalName
  }

  get name() {
    return this.configuration.name
  }

  get dependency() {
    return this.specification.dependency
  }

  get externalType() {
    return this.remoteSpecification?.externalIdentifier ?? this.specification.externalIdentifier
  }

  get surface() {
    return this.specification.surface
  }

  constructor(options: {
    configuration: TConfiguration
    configurationPath: string
    entryPath: string
    directory: string
    specification: ExtensionSpec
    remoteSpecification?: api.graphql.RemoteSpecification
    extensionPointSpecs?: ExtensionPointSpec[]
  }) {
    this.configuration = options.configuration
    this.configurationPath = options.configurationPath
    this.entrySourceFilePath = options.entryPath
    this.directory = options.directory
    this.specification = options.specification
    this.remoteSpecification = options.remoteSpecification
    this.extensionPointSpecs = options.extensionPointSpecs
    this.outputBundlePath = path.join(options.directory, 'dist/main.js')
    this.devUUID = `dev-${id.generateRandomUUID()}`
    this.localIdentifier = path.basename(options.directory)
    this.idEnvironmentVariableName = `SHOPIFY_${string.constantize(path.basename(this.directory))}_ID`
  }

  async build(stdout: Writable, stderr: Writable, app: AppInterface) {
    stdout.write(`Bundling UI extension ${this.localIdentifier}...`)
    await bundleExtension({
      minify: true,
      outputBundlePath: this.outputBundlePath,
      sourceFilePath: this.entrySourceFilePath,
      environment: 'production',
      env: app.dotenv?.variables ?? {},
      stderr,
      stdout,
    })
    stdout.write(`${this.localIdentifier} successfully built`)
  }

  deployConfig(): Promise<{[key: string]: unknown}> {
    return this.specification.deployConfig?.(this.configuration, this.directory) ?? Promise.resolve({})
  }

  preDeployValidation() {
    if (!this.specification.preDeployValidation) return Promise.resolve()
    return this.specification.preDeployValidation(this.configuration)
  }

  resourceUrl() {
    if (this.extensionPointSpecs) {
      // PENDING: Add support for externsion pints
      return ''
    } else {
      return this.specification.resourceUrl?.(this.configuration) ?? ''
    }
  }

  async publishURL(options: {orgId: string; appId: string; extensionId?: string}) {
    const partnersFqdn = await environment.fqdn.partners()
    const parnersPath = this.specification.partnersWebIdentifier
    return `https://${partnersFqdn}/${options.orgId}/apps/${options.appId}/extensions/${parnersPath}/${options.extensionId}`
  }

  previewMessage(url: string, storeFqdn: string) {
    const heading = output.token.heading(`${this.name} (${this.humanName})`)
    let message = output.content`Preview link: ${url}/extensions/${this.devUUID}`

    if (this.specification.previewMessage) {
      const customMessage = this.specification.previewMessage(url, this.devUUID, this.configuration, storeFqdn)
      if (!customMessage) return
      message = customMessage
    }

    return output.content`${heading}\n${message.value}\n`
  }

  private extensionPointURL(point: ExtensionPointSpec, config: ExtensionPointContents): string {
    return point.resourceUrl?.(config) ?? ''
  }
}

/**
 * Find the registered spececification for a given extension type
 */
export async function specForType(type: string): Promise<ExtensionSpec | undefined> {
  const allSpecs = await allExtensionSpecifications()
  return allSpecs.find((spec) => spec.identifier === type || spec.externalIdentifier === type)
}

// PENDING: Fetch remote specs
function remoteSpecForType(type: string): api.graphql.RemoteSpecification | undefined {
  return undefined
}

export function createExtensionSpec<TConfiguration extends BaseConfigContents = BaseConfigContents>(spec: {
  identifier: string
  externalIdentifier: string
  partnersWebIdentifier: string
  surface: string
  externalName: string
  showInCLIHelp?: boolean
  dependency?: {name: string; version: string}
  templatePath?: string
  graphQLType?: string
  schema: ZodSchemaType<TConfiguration>
  deployConfig?: (config: TConfiguration, directory: string) => Promise<{[key: string]: unknown}>
  preDeployValidation?: (config: TConfiguration) => Promise<void>
  resourceUrl?: (config: TConfiguration) => string
  previewMessage?: (
    host: string,
    uuid: string,
    config: TConfiguration,
    storeFqdn: string,
  ) => output.TokenizedString | undefined
}): ExtensionSpec<TConfiguration> {
  const defaults = {
    showInCLIHelp: true,
  }
  return {...defaults, ...spec}
}
