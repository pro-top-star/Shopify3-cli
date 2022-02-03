import {
  string,
  path,
  template,
  fs,
  system,
  output,
  version,
  os,
} from '@shopify/cli-kit';

import {template as getTemplatePath} from '../utils/paths';

interface InitOptions {
  name: string;
  description: string;
  directory: string;
}

async function init(options: InitOptions) {
  const user = (await os.username()) ?? '';
  const templatePath = await getTemplatePath('app');
  const cliVersion = await version.latestNpmPackageVersion('@shopify/cli');
  const outputDirectory = path.join(
    options.directory,
    string.hyphenize(options.name),
  );
  console.log('Creating the app...');
  createApp({...options, outputDirectory, templatePath, cliVersion, user});
  output.success(
    output.content`App successfully created at ${output.token.path(
      outputDirectory,
    )}`,
  );
}

async function createApp(
  options: InitOptions & {
    outputDirectory: string;
    templatePath: string;
    cliVersion: string;
    user: string;
  },
): Promise<void> {
  const templateFiles: string[] = await path.glob(
    path.join(options.templatePath, '**/*'),
  );
  // We sort them topologically to start creating
  // them from the most nested paths.
  const sortedTemplateFiles = templateFiles
    .map((path) => path.split('/'))
    .sort((lhs, rhs) => (lhs.length < rhs.length ? 1 : -1))
    .map((components) => components.join('/'));

  const templateData = {
    name: options.name,
    description: options.description,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    shopify_cli_version: options.cliVersion,
    author: options.user,
  };

  sortedTemplateFiles.forEach(async (templateItemPath) => {
    const outputPath = await template(
      path.join(
        options.outputDirectory,
        path.relative(options.templatePath, templateItemPath),
      ),
    )(templateData);
    if (fs.isDirectory(templateItemPath)) {
      await system.mkdir(outputPath);
    } else {
      await system.mkdir(path.dirname(outputPath));
      const content = await fs.readFile(templateItemPath);
      const contentOutput = await template(content)(templateData);
      await fs.write(outputPath, contentOutput);
    }
  });
}

export default init;
