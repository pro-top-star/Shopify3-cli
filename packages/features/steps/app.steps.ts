import {executables} from '../lib/constants'
import {exec} from '../lib/system'
import path from 'pathe'
import {When, Then} from '@cucumber/cucumber'
import fs from 'fs-extra'
import {strict as assert} from 'assert'

interface ExtensionConfiguration {
  name: string
  extensionType: string
}

When(
  /I create a extension named (.+) of type (.+)/,
  {timeout: 2 * 60 * 1000},
  async function (extensionName: string, extensionType: string) {
    try {
      await exec(
        executables.cli,
        ['app', 'scaffold', 'extension', '--name', extensionName, '--path', this.appDirectory, '--type', extensionType],
        {env: {...process.env, ...this.temporaryEnv}},
      )
      // eslint-disable-next-line no-catch-all/no-catch-all
    } catch {
      assert.ok(true)
    }
  },
)

Then(
  /I have a (.+) extension named (.+) of type (.+)/,
  {},
  async function (category: string, appName: string, extensionType: string) {
    const appInfo = await this.appInfo()
    const extension = appInfo.extensions[category].find((extension: {configuration: ExtensionConfiguration}) => {
      return extension.configuration.name === appName
    })
    if (!extension) assert.fail(`Extension not created! Config:\n${JSON.stringify(appInfo, null, 2)}`)
    assert.equal(extension.configuration.type, extensionType)
  },
)

Then(
  /I do not have a (.+) extension named (.+) of type (.+)/,
  {},
  async function (category: string, appName: string, extensionType: string) {
    const appInfo = await this.appInfo()
    const extension = appInfo.extensions[category].find((extension: {configuration: ExtensionConfiguration}) => {
      return extension.configuration.name === appName
    })
    assert.equal(extension, undefined)
  },
)

Then(/The extension named (.+) contains the theme extension directories/, {}, async function (appName: string) {
  const appInfo = await this.appInfo()
  const extension = appInfo.extensions.theme.find((extension: {configuration: ExtensionConfiguration}) => {
    return extension.configuration.name === appName
  })
  if (!extension) assert.fail(`Extension not created! Config:\n${JSON.stringify(appInfo, null, 2)}`)
  const expectedDirectories = ['assets', 'blocks', 'locales', 'snippets']

  const nonExistingPaths = expectedDirectories
    .flatMap((directory) => {
      return [path.join(extension.directory, directory), path.join(extension.directory, directory, '.gitkeep')]
    })
    .filter((expectedPath) => {
      return !fs.pathExistsSync(expectedPath)
    })
  if (nonExistingPaths.length !== 0) {
    assert.fail(`The following paths were not found in the theme extension: ${nonExistingPaths.join(', ')}`)
  }
})
