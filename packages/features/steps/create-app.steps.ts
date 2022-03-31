import {executables, directories} from '../lib/constants'
import {exec} from '../lib/system'
import {When, Then} from '@cucumber/cucumber'
import {strict as assert} from 'assert'

When(
  /I create an app named (.+) with (.+) as dependency manager and (.+) as the template/,
  {timeout: 2 * 60 * 1000},
  async function (appName: string, dependencyManager: string, templateUrl: string) {
    const {stdout} = await exec(executables.createApp, [
      '--name',
      appName,
      '--path',
      this.temporaryDirectory,
      '--dependency-manager',
      dependencyManager,
      '--template',
      templateUrl,
      '--shopify-cli-version',
      `file:${directories.packages.cli}`,
      '--shopify-app-version',
      `file:${directories.packages.app}`,
      '--shopify-cli-kit-version',
      `file:${directories.packages.cliKit}`,
    ])
    const hyphenatedAppName = stdout.match(/Initializing your app ([\w-]+)/)[1]
    this.appDirectory = `${this.temporaryDirectory}/${hyphenatedAppName}`
  },
)

Then(
  /I have an app named (.+) scaffolded from the template with (.+) as dependency manager/,
  {},
  async function (appName: string, dependencyManager: string) {
    const {stdout} = await exec(executables.cli, ['app', 'info', '--path', this.appDirectory])
    const results = JSON.parse(stdout)
    assert.equal(results.configuration.name, appName)
    assert.equal(results.packageManager, dependencyManager)
  },
)
