import {runGoExtensionsCLI, nodeExtensionsCLIPath} from './cli'
import {getBinaryPathOrDownload} from './binary'
import {useExtensionsCLISources} from '../../environment'
import {describe, test, expect, vi} from 'vitest'
import {system} from '@shopify/cli-kit'

vi.mock('../../environment')
vi.mock('./binary')
vi.mock('@shopify/cli-kit', async () => {
  const cliKit: any = await vi.importActual('@shopify/cli-kit')
  return {
    ...cliKit,
    system: {
      captureOutput: vi.fn(),
      exec: vi.fn(),
    },
  }
})

describe('runGoExtensionsCLI', () => {
  test('runs the CLI through Make when using the local sources', async () => {
    // Given
    const projectDirectory = '/path/to/shopify-cli-extensions'
    vi.mocked(useExtensionsCLISources).mockReturnValue(true)
    vi.mocked(system.captureOutput).mockResolvedValue(projectDirectory)

    // When
    const got = await runGoExtensionsCLI(['build'])

    // Then
    expect(vi.mocked(system.exec)).toHaveBeenCalledWith('make', ['build'], {colors: true, stdout: undefined, stderr: undefined, cwd: projectDirectory})
  })

  test('runs the CLI through the downloaded binary when not using the local sources', async () => {
    // Given
    const binaryPath = '/path/to/binary'
    vi.mocked(useExtensionsCLISources).mockReturnValue(false)
    vi.mocked(getBinaryPathOrDownload).mockResolvedValue(binaryPath)

    // When
    const got = await runGoExtensionsCLI(['build'])

    // Then
    expect(vi.mocked(system.exec)).toHaveBeenCalledWith(binaryPath, ['build'], {...{colors: true}})
  })
})

describe('nodeExtensionsCLIPath', () => {
  test('returns the path', async () => {
    // When
    const got = await nodeExtensionsCLIPath()

    // Then
    expect(got).not.toBeUndefined()
  })
})
