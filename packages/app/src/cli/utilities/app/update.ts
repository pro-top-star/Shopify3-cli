import {file, path, toml} from '@shopify/cli-kit'
import {App, AppConfigurationSchema} from '$cli/models/app/app'
import {configurationFileNames} from '$cli/constants'

export async function updateAppConfigurationFile(app: App, data: {name: string; id: string}): Promise<void> {
  const confPath = path.join(app.directory, configurationFileNames.app)
  const parsed = AppConfigurationSchema.parse(data)
  const configurationContent = toml.stringify(parsed)
  await file.write(confPath, '# This file stores configurations for your Shopify app.\n\n')
  await file.append(confPath, configurationContent)
}
