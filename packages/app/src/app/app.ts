import {file, error, path, schema, toml} from '@shopify/cli-kit';

import {blocks, configurationFileNames} from '../constants';

const AppConfigurationSchema = schema.z.object({
  name: schema.z.string(),
});

type AppConfiguration = schema.z.infer<typeof AppConfigurationSchema>;

const UIExtensionConfigurationSchema = schema.z.object({
  name: schema.z.string(),
});

type UIExtensionConfiguration = schema.z.infer<
  typeof UIExtensionConfigurationSchema
>;

const ScriptConfigurationSchema = schema.z.object({
  name: schema.z.string(),
});

type ScriptConfiguration = schema.z.infer<typeof ScriptConfigurationSchema>;

interface Script {
  configuration: ScriptConfiguration;
  directory: string;
}

interface UIExtension {
  configuration: UIExtensionConfiguration;
  directory: string;
}

interface App {
  directory: string;
  configuration: AppConfiguration;
  scripts: Script[];
  uiExtensions: UIExtension[];
}

export async function load(directory: string): Promise<App> {
  if (!file.exists(directory)) {
    throw new error.Abort(`Couldn't find directory ${directory}`);
  }
  const configurationPath = path.join(directory, configurationFileNames.app);
  const configurationObject = loadConfigurationFile(configurationPath);
  const configuration = AppConfigurationSchema.parse(configurationObject);
  const scripts = await loadScripts(directory);
  const uiExtensions = await loadExtensions(directory);

  return {
    directory,
    configuration,
    scripts,
    uiExtensions,
  };
}

function loadConfigurationFile(path: string): object {
  if (!file.exists(path)) {
    throw new error.Abort(`Couldn't find the configuration file at ${path}`);
  }
  const configurationContent = file.read(path);
  return toml.parse(configurationContent);
}

async function loadExtensions(rootDirectory: string): Promise<UIExtension[]> {
  const extensionsPath = path.join(
    rootDirectory,
    `${blocks.uiExtensions.directoryName}/*`,
  );
  return (await path.glob(extensionsPath, {onlyDirectories: true})).map(
    (directory: string) => {
      const configurationPath = path.join(
        directory,
        blocks.uiExtensions.configurationName,
      );
      const configurationObject = loadConfigurationFile(configurationPath);
      const configuration =
        UIExtensionConfigurationSchema.parse(configurationObject);

      return {directory, configuration};
    },
  );
}

async function loadScripts(rootDirectory: string): Promise<Script[]> {
  const scriptsPath = path.join(
    rootDirectory,
    `${blocks.scripts.directoryName}/*`,
  );
  return (await path.glob(scriptsPath, {onlyDirectories: true})).map(
    (directory: string) => {
      const configurationPath = path.join(
        directory,
        blocks.scripts.configurationName,
      );
      const configurationObject = loadConfigurationFile(configurationPath);
      const configuration =
        ScriptConfigurationSchema.parse(configurationObject);

      return {directory, configuration};
    },
  );
}
