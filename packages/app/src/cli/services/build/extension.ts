import {path, system, yaml} from '@shopify/cli-kit'
import {Writable} from 'node:stream'
import {App, Extension} from '$cli/models/app/app'

interface HomeOptions {
  stdout: Writable
  stderr: Writable
  app: App
}

export default async function extension(extension: Extension, {stdout, stderr, app}: HomeOptions): Promise<void> {
  stdout.write('Starting the extension build')
  await system.exec(await extensionsBinaryPath(), ['build', '-'], {
    cwd: app.directory,
    stdout,
    stderr,
    stdin: yaml.encode(extensionConfig(extension, app)),
  })
}

function extensionConfig(extension: Extension, app: App): object {
  const extensionRelativePath = path.relative(app.directory, extension.directory)
  const envConfigs = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    root_dir: '.',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    build_dir: path.join(extensionRelativePath, 'build/development'),
    entries: {
      main: path.join(extensionRelativePath, 'src/index.js'),
    },
  }
  return {
    extensions: [
      {
        title: extension.configuration.name,
        type: extension.configuration.type,
        metafields: [],
        commands: {
          build: 'shopify-cli-extensions build',
        },
        development: envConfigs,
      },
    ],
  }
}

async function extensionsBinaryPath(): Promise<string> {
  const binaryDir = await system.captureOutput('/opt/dev/bin/dev', ['project-path', 'shopify-cli-extensions'])
  return path.join(binaryDir, 'shopify-extensions')
}
