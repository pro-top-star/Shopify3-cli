/* eslint-disable no-irregular-whitespace */
import AppScaffoldExtension from './extension'
import {ExtensionTypesHumanKeys, getExtensionOutputConfig} from '../../../constants'
import {App, load as loadApp} from '../../../models/app/app'
import scaffoldExtensionPrompt from '../../../prompts/scaffold/extension'
import scaffoldExtensionService from '../../../services/scaffold/extension'
import {describe, expect, it, vi, beforeAll} from 'vitest'
import {path, outputMocker} from '@shopify/cli-kit'

beforeAll(() => {
  vi.mock('../../../constants')
  vi.mock('../../../models/app/app')
  vi.mock('../../../prompts/scaffold/extension')
  vi.mock('../../../services/scaffold/extension')
})

describe('after extension command finishes correctly', () => {
  it('displays a confirmation message with only the human-facing name', async () => {
    // Given
    const outputInfo = mockSuccessfulCommandExecution({
      humanKey: 'checkout UI',
    })

    // When
    await AppScaffoldExtension.run()

    // Then
    expect(outputInfo.completed()).toMatchInlineSnapshot('"Your checkout UI extension was added to your project!"')
    expect(outputInfo.info()).toMatchInlineSnapshot('"\n  To find your extension, remember to cd extensions/name\n"')
  })

  it('displays a confirmation message with human-facing name and help url', async () => {
    // Given
    const outputInfo = mockSuccessfulCommandExecution({
      humanKey: 'checkout UI',
      helpURL: 'http://help.com',
    })

    // When
    await AppScaffoldExtension.run()

    // Then

    expect(outputInfo.completed()).toMatchInlineSnapshot('"Your checkout UI extension was added to your project!"')
    expect(outputInfo.info()).toMatchInlineSnapshot(
      `"\n  To find your extension, remember to cd extensions/name\n  For more details, see the docs (​http://help.com​) ✨\n"`,
    )
  })

  it('displays a confirmation message with human-facing name and additional help', async () => {
    // Given
    const outputInfo = mockSuccessfulCommandExecution({
      humanKey: 'checkout UI',
      additionalHelp: 'Additional help',
    })

    // When
    await AppScaffoldExtension.run()

    // Then
    expect(outputInfo.completed()).toMatchInlineSnapshot('"Your checkout UI extension was added to your project!"')
    expect(outputInfo.info()).toMatchInlineSnapshot(
      `"\n  To find your extension, remember to cd extensions/name\n  Additional help\n"`,
    )
  })

  it('displays a confirmation message with human-facing name , help url and additional help', async () => {
    // Given
    const outputInfo = mockSuccessfulCommandExecution({
      humanKey: 'checkout UI',
      helpURL: 'http://help.com',
      additionalHelp: 'Additional help',
    })

    // When
    await AppScaffoldExtension.run()

    // Then
    expect(outputInfo.completed()).toMatchInlineSnapshot('"Your checkout UI extension was added to your project!"')
    expect(outputInfo.info()).toMatchInlineSnapshot(
      `"\n  To find your extension, remember to cd extensions/name\n  Additional help\n  For more details, see the docs (​http://help.com​) ✨\n"`,
    )
  })
})

function mockSuccessfulCommandExecution(outputConfig: {
  humanKey: ExtensionTypesHumanKeys
  helpURL?: string
  additionalHelp?: string
}) {
  const appRoot = '/'
  const app: App = {
    name: 'myapp',
    idEnvironmentVariableName: 'SHOPIFY_API_KEY',
    directory: appRoot,
    dependencyManager: 'yarn',
    configurationPath: path.join(appRoot, 'shopify.app.toml'),
    configuration: {
      scopes: '',
    },
    webs: [],
    nodeDependencies: {},
    extensions: {ui: [], function: [], theme: []},
  }

  vi.mocked(getExtensionOutputConfig).mockReturnValue(outputConfig)
  vi.mocked(loadApp).mockResolvedValue(app)
  vi.mocked(scaffoldExtensionPrompt).mockResolvedValue({name: 'name', extensionType: 'theme'})
  vi.mocked(scaffoldExtensionService).mockResolvedValue(path.join(appRoot, 'extensions', 'name'))

  return outputMocker.mockAndCaptureOutput()
}
