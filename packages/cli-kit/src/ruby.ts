import * as file from './file'
import * as ui from './ui'
import * as system from './system'
import {Fatal} from './error'
import {join} from './path'
import constants from './constants'
// eslint-disable-next-line no-restricted-imports
import {spawn} from 'child_process'

const RubyCLIVersion = '2.15.6'

/**
 * Execute CLI 2.0 commands.
 * Installs a version of RubyCLI as a vendor dependency in a hidden folder in the system.
 * User must have a valid ruby+bundler environment to run any command.
 *
 * @param args {string[]} List of argumets to execute. (ex: ['theme', 'pull'])
 * @param token {string} Token to pass to CLI 2.0, will be set as an environment variable
 */
export async function exec(args: string[], token: string) {
  await installDependencies()
  spawn('bundle', ['exec', 'shopify'].concat(args), {
    stdio: 'inherit',
    shell: true,
    cwd: rubyCLIPath(),
    env: {...process.env, SHOPIFY_ADMIN_TOKEN: token},
  })
}

/**
 * Validate Ruby Enviroment
 * Install RubyCLI and its dependencies
 * Shows a loading spinner if it's the first time installing dependencies
 * or if we are installing a new version of RubyCLI
 */
async function installDependencies() {
  const exists = await file.exists(rubyCLIPath())
  const renderer = exists ? 'silent' : 'default'

  const list = new ui.Listr(
    [
      {
        title: 'Installing theme dependencies',
        task: async () => {
          await validateRubyEnv()
          await createWorkingDirectory()
          await createGemfile()
          await bundleInstall()
        },
      },
    ],
    {renderer},
  )
  await list.run()
}

async function validateRubyEnv() {
  try {
    await system.exec('ruby', ['-v'])
  } catch {
    throw new Fatal(
      'Ruby environment not found',
      'Make sure you have ruby installed on your system: https://www.ruby-lang.org/en/documentation/installation/',
    )
  }

  try {
    await system.exec('bundler', ['-v'])
  } catch {
    throw new Fatal('Bundler not found', 'Make sure you have Bundler installed on your system: https://bundler.io/')
  }
}

function createWorkingDirectory() {
  return file.mkdir(rubyCLIPath())
}

async function createGemfile() {
  const gemPath = join(rubyCLIPath(), 'Gemfile')
  await file.write(gemPath, `source 'https://rubygems.org'\ngem 'shopify-cli', '${RubyCLIVersion}'`)
}

async function bundleInstall() {
  await system.exec('bundle', ['config', 'set', '--local', 'path', rubyCLIPath()], {cwd: rubyCLIPath()})
  await system.exec('bundle', ['install'], {cwd: rubyCLIPath()})
}

function rubyCLIPath() {
  return join(constants.paths.directories.cache.vendor.path(), 'ruby-cli', RubyCLIVersion)
}
