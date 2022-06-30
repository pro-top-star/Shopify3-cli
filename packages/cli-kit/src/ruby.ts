import * as file from './file.js'
import * as ui from './ui.js'
import * as system from './system.js'
import {Abort} from './error.js'
import {glob, join} from './path.js'
import constants from './constants.js'
import {coerce} from './semver.js'
import {AdminSession} from './session.js'
import {content, token} from './output.js'
// eslint-disable-next-line no-restricted-imports
import {spawn} from 'child_process'
import {Writable} from 'node:stream'

const RubyCLIVersion = '2.16.0'
const ThemeCheckVersion = '1.10.2'
const MinBundlerVersion = '2.3.8'
const MinRubyVersion = '2.3.0'
const MinRubyGemVersion = '2.5.0'

/**
 * Execute CLI 2.0 commands.
 * Installs a version of RubyCLI as a vendor dependency in a hidden folder in the system.
 * User must have a valid ruby+bundler environment to run any command.
 *
 * @param args {string[]} List of argumets to execute. (ex: ['theme', 'pull'])
 * @param adminSession {AdminSession} Contains token and store to pass to CLI 2.0, which will be set as environment variables
 */
export async function execCLI(args: string[], adminSession?: AdminSession) {
  await installCLIDependencies()
  const env = {
    ...process.env,
    SHOPIFY_CLI_ADMIN_AUTH_TOKEN: adminSession?.token,
    SHOPIFY_CLI_STORE: adminSession?.storeFqdn,
  }

  spawn('bundle', ['exec', 'shopify'].concat(args), {
    stdio: 'inherit',
    cwd: shopifyCLIDirectory(),
    shell: true,
    env,
  })
}

interface ExecThemeCheckCLIOptions {
  directories: string[]
  args?: string[]
  stdout: Writable
  stderr: Writable
}
export async function execThemeCheckCLI({
  directories,
  args,
  stdout,
  stderr,
}: ExecThemeCheckCLIOptions): Promise<void[]> {
  await installThemeCheckCLIDependencies(stdout)

  const processes = directories.map(async (directory): Promise<void> => {
    // Check that there are files aside from the extension TOML config file,
    // otherwise theme-check will return a false failure.
    const files = await glob(join(directory, '/**/*'))
    const fileCount = files.filter((file) => !file.match(/\.toml$/)).length
    if (fileCount === 0) return

    const customStderr = new Writable({
      write(chunk, ...args) {
        // For some reason, theme-check reports this initial status line to stderr
        // See https://github.com/Shopify/theme-check/blob/1092737cfb58a73ca397ffb1371665dc55df2976/lib/theme_check/language_server/diagnostics_engine.rb#L31
        // which leads to https://github.com/Shopify/theme-check/blob/1092737cfb58a73ca397ffb1371665dc55df2976/lib/theme_check/language_server/io_messenger.rb#L65
        if (chunk.toString('ascii').match(/^Checking/)) {
          stdout.write(chunk, ...args)
        } else {
          stderr.write(chunk, ...args)
        }
      },
    })
    await system.exec('bundle', ['exec', 'theme-check'].concat([directory, ...(args || [])]), {
      stdout,
      stderr: customStderr,
      cwd: themeCheckDirectory(),
    })
  })
  return Promise.all(processes)
}

/**
 * Validate Ruby Enviroment
 * Install Theme Check CLI and its dependencies
 * Shows a loading message if it's the first time installing dependencies
 * or if we are installing a new version of Theme Check CLI
 */
async function installThemeCheckCLIDependencies(stdout: Writable) {
  const exists = await file.exists(themeCheckDirectory())

  if (!exists) stdout.write('Installing theme dependencies...')
  const list = new ui.Listr(
    [
      {
        title: 'Installing theme dependencies',
        task: async () => {
          await validateRubyEnv()
          await createThemeCheckCLIWorkingDirectory()
          await createThemeCheckGemfile()
          await bundleInstallThemeCheck()
        },
      },
    ],
    {renderer: 'silent'},
  )
  await list.run()
  if (!exists) stdout.write('Installed theme dependencies!')
}

/**
 * Validate Ruby Enviroment
 * Install RubyCLI and its dependencies
 * Shows a loading spinner if it's the first time installing dependencies
 * or if we are installing a new version of RubyCLI
 */
async function installCLIDependencies() {
  const exists = await file.exists(shopifyCLIDirectory())
  const renderer = exists ? 'silent' : 'default'

  const list = new ui.Listr(
    [
      {
        title: 'Installing theme dependencies',
        task: async () => {
          await validateRubyEnv()
          await createShopifyCLIWorkingDirectory()
          await createShopifyCLIGemfile()
          await bundleInstallShopifyCLI()
        },
      },
    ],
    {renderer},
  )
  await list.run()
}

async function validateRubyEnv() {
  await validateRuby()
  await validateRubyGems()
  await validateBundler()
}

async function validateRuby() {
  let version
  try {
    const stdout = await system.captureOutput('ruby', ['-v'])
    version = coerce(stdout)
  } catch {
    throw new Abort(
      'Ruby environment not found',
      `Make sure you have Ruby installed on your system: ${
        content`${token.link('', 'https://www.ruby-lang.org/en/documentation/installation/')}`.value
      }`,
    )
  }

  const isValid = version?.compare(MinRubyVersion)
  if (isValid === -1 || isValid === undefined) {
    throw new Abort(
      `Ruby version ${content`${token.yellow(version!.raw)}`.value} is not supported`,
      `Make sure you have at least Ruby ${content`${token.yellow(MinRubyVersion)}`.value} installed on your system: ${
        content`${token.link('', 'https://www.ruby-lang.org/en/documentation/installation/')}`.value
      }`,
    )
  }
}

async function validateRubyGems() {
  const stdout = await system.captureOutput('gem', ['-v'])
  const version = coerce(stdout)

  const isValid = version?.compare(MinRubyGemVersion)
  if (isValid === -1 || isValid === undefined) {
    throw new Abort(
      `RubyGems version ${content`${token.yellow(version!.raw)}`.value} is not supported`,
      `To update to the latest version of RubyGems, run ${
        content`${token.genericShellCommand('gem update --system')}`.value
      }`,
    )
  }
}

async function validateBundler() {
  let version
  try {
    const stdout = await system.captureOutput('bundler', ['-v'])
    version = coerce(stdout)
  } catch {
    throw new Abort(
      'Bundler not found',
      `To install the latest version of Bundler, run ${
        content`${token.genericShellCommand('gem install bundler')}`.value
      }`,
    )
  }

  const isValid = version?.compare(MinBundlerVersion)
  if (isValid === -1 || isValid === undefined) {
    throw new Abort(
      `Bundler version ${content`${token.yellow(version!.raw)}`.value} is not supported`,
      `To update to the latest version of Bundler, run ${
        content`${token.genericShellCommand('gem install bundler')}`.value
      }`,
    )
  }
}

function createShopifyCLIWorkingDirectory() {
  return file.mkdir(shopifyCLIDirectory())
}

function createThemeCheckCLIWorkingDirectory() {
  return file.mkdir(themeCheckDirectory())
}

async function createShopifyCLIGemfile() {
  const gemPath = join(shopifyCLIDirectory(), 'Gemfile')
  await file.write(gemPath, `source 'https://rubygems.org'\ngem 'shopify-cli', '${RubyCLIVersion}'`)
}

async function createThemeCheckGemfile() {
  const gemPath = join(themeCheckDirectory(), 'Gemfile')
  await file.write(gemPath, `source 'https://rubygems.org'\ngem 'theme-check', '${ThemeCheckVersion}'`)
}

async function bundleInstallShopifyCLI() {
  await system.exec('bundle', ['config', 'set', '--local', 'path', shopifyCLIDirectory()], {cwd: shopifyCLIDirectory()})
  await system.exec('bundle', ['install'], {cwd: shopifyCLIDirectory()})
}

async function bundleInstallThemeCheck() {
  await system.exec('bundle', ['config', 'set', '--local', 'path', themeCheckDirectory()], {cwd: themeCheckDirectory()})
  await system.exec('bundle', ['install'], {cwd: themeCheckDirectory()})
}

function shopifyCLIDirectory() {
  return join(constants.paths.directories.cache.vendor.path(), 'ruby-cli', RubyCLIVersion)
}

function themeCheckDirectory() {
  return join(constants.paths.directories.cache.vendor.path(), 'theme-check', ThemeCheckVersion)
}

export async function version(): Promise<string | undefined> {
  const parseOutput = (version: string) => version.match(/ruby (\d+\.\d+\.\d+)/)?.[1]
  return system
    .captureOutput('ruby', ['-v'])
    .then(parseOutput)
    .catch(() => undefined)
}
