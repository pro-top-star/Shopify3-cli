import Command from './base-command.js'
import {Presets, presetsFilename} from '../public/node/presets.js'
import {globalFlags} from '../cli.js'
import {mkdir, mkTmpDir, rmdir, write as writeFile} from '../file.js'
import {mockAndCaptureOutput} from '../testing/output.js'
import {encode as encodeTOML} from '../toml.js'
import {join as pathJoin, resolve as resolvePath} from '../path.js'
import {afterEach, beforeEach, describe, expect, test} from 'vitest'
import {Flags} from '@oclif/core'

let testResult: {[flag: string]: unknown} = {}
let testError: Error | undefined
let disableFindUpPresets = true

class MockCommand extends Command {
  /* eslint-disable rulesdir/command-flags-with-env */
  static flags = {
    ...globalFlags,
    path: Flags.string({
      parse: (input, _) => Promise.resolve(resolvePath(input)),
      default: '.',
    }),
    someString: Flags.string({}),
    someInteger: Flags.integer({}),
    someBoolean: Flags.boolean({
      allowNo: true,
    }),
    someExclusiveBoolean: Flags.boolean({
      exclusive: ['someBoolean'],
    }),
    someMultipleString: Flags.string({multiple: true}),
    someStringWithDefault: Flags.string({
      default: 'default stringy',
    }),
  }
  /* eslint-enable rulesdir/command-flags-with-env */

  async run(): Promise<void> {
    const {flags} = await this.parse(MockCommand)
    testResult = flags
  }

  async catch(error: Error): Promise<void> {
    testError = error
  }

  findUpForPresets() {
    if (disableFindUpPresets) return false
    return super.findUpForPresets()
  }
}

const validPreset = {
  someString: 'stringy',
  someBoolean: true,
}

const validPresetWithIrrelevantFlag = {
  ...validPreset,
  irrelevantString: 'stringy',
}

const presetWithIncorrectType = {
  someInteger: 'stringy',
}

const presetWithExclusiveArguments = {
  someBoolean: true,
  someExclusiveBoolean: false,
}

const presetWithNegativeBoolean = {
  someBoolean: false,
}

const presetWithMultiples = {
  someMultipleString: ['multiple', 'stringies'],
}

const presetMatchingDefault = {
  someStringWithDefault: 'default stringy',
}

const presetWithDefaultOverride = {
  someStringWithDefault: 'non-default stringy',
}

const allPresets: Presets = {
  validPreset,
  validPresetWithIrrelevantFlag,
  presetWithIncorrectType,
  presetWithExclusiveArguments,
  presetWithNegativeBoolean,
  presetWithMultiples,
  presetMatchingDefault,
  presetWithDefaultOverride,
}

describe('applying presets', async () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkTmpDir()
    await writeFile(pathJoin(tmpDir, presetsFilename), encodeTOML(allPresets as any))
    disableFindUpPresets = false
  })

  afterEach(async () => {
    if (tmpDir) {
      await rmdir(tmpDir)
    }
    testResult = {}
    testError = undefined
  })

  function expectFlags(path: string, preset: keyof typeof allPresets) {
    expect(testResult).toEqual({
      path: resolvePath(path),
      someStringWithDefault: 'default stringy',
      preset,
      ...allPresets[preset],
    })
  }

  test('does not apply a preset when none is specified', async () => {
    // Given
    const outputMock = mockAndCaptureOutput()
    outputMock.clear()

    // When
    await MockCommand.run(['--path', tmpDir])

    // Then
    expect(testResult).toEqual({
      path: resolvePath(tmpDir),
      someStringWithDefault: 'default stringy',
    })
    expect(outputMock.info()).toEqual('')
  })

  test('applies a preset when one is specified', async () => {
    // Given
    const outputMock = mockAndCaptureOutput()
    outputMock.clear()

    // When
    await MockCommand.run(['--path', tmpDir, '--preset', 'validPreset'])

    // Then
    expectFlags(tmpDir, 'validPreset')
    expect(outputMock.info()).toMatchInlineSnapshot(`
      "Using applicable flags from the preset validPreset:

      • someString = stringy
      • someBoolean = true\n"
    `)
  })

  test('searches up recursively from path by default', async () => {
    // Given
    const subdir = pathJoin(tmpDir, 'somedir', '--preset', 'validPreset')
    await mkdir(subdir)

    // When
    await MockCommand.run(['--path', subdir, '--preset', 'validPreset'])

    // Then
    expectFlags(subdir, 'validPreset')
  })

  test('searches only in the current directory when recursive search is disabled', async () => {
    // Given
    const subdir = pathJoin(tmpDir, 'somedir')
    await mkdir(subdir)
    disableFindUpPresets = true

    // When
    await MockCommand.run(['--path', subdir, '--preset', 'validPreset'])

    // Then
    expect(testResult).toEqual({
      path: resolvePath(subdir),
      preset: 'validPreset',
      // no flags applied from the preset
      someStringWithDefault: 'default stringy',
    })
  })

  test('prefers command line arguments to preset settings', async () => {
    // Given
    const outputMock = mockAndCaptureOutput()
    outputMock.clear()

    // When
    await MockCommand.run(['--path', tmpDir, '--preset', 'validPreset', '--someString', 'cheesy'])

    // Then
    expect(testResult.someString).toEqual('cheesy')
    expect(outputMock.info()).toMatchInlineSnapshot(`
      "Using applicable flags from the preset validPreset:

      • someBoolean = true\n"
    `)
  })

  test('ignores the specified preset when it does not exist', async () => {
    // When
    await MockCommand.run(['--path', tmpDir, '--preset', 'nonexistentPreset'])

    // Then
    expect(testResult).toEqual({
      path: resolvePath(tmpDir),
      preset: 'nonexistentPreset',
      someStringWithDefault: 'default stringy',
    })
  })

  test('does not apply flags irrelevant to the current command', async () => {
    // When
    await MockCommand.run(['--path', tmpDir, '--preset', 'validPresetWithIrrelevantFlag'])

    // Then
    expect(testResult).toEqual({
      path: resolvePath(tmpDir),
      preset: 'validPresetWithIrrelevantFlag',
      ...validPreset,
      someStringWithDefault: 'default stringy',
    })
  })

  test('throws when an argument of the incorrect type is provided', async () => {
    // When
    await MockCommand.run(['--path', tmpDir, '--preset', 'presetWithIncorrectType'])

    // Then
    expect(testError?.message).toEqual('Expected an integer but received: stringy')
  })

  test('throws when exclusive arguments are provided', async () => {
    // When
    await MockCommand.run(['--path', tmpDir, '--preset', 'presetWithExclusiveArguments'])

    // Then
    expect(testError?.message).toMatch('Unexpected argument: --no-someExclusiveBoolean')
  })

  test('negates booleans correctly', async () => {
    // When
    await MockCommand.run(['--path', tmpDir, '--preset', 'presetWithNegativeBoolean'])

    // Then
    expectFlags(tmpDir, 'presetWithNegativeBoolean')
  })

  test('handles multiples correctly', async () => {
    // When
    await MockCommand.run(['--path', tmpDir, '--preset', 'presetWithMultiples'])

    // Then
    expectFlags(tmpDir, 'presetWithMultiples')
  })

  test('throws when exclusive arguments are provided when combining command line + preset', async () => {
    // When
    await MockCommand.run(['--path', tmpDir, '--preset', 'validPreset', '--someExclusiveBoolean'])

    // Then
    expect(testError?.message).toMatch('--someBoolean= cannot also be provided when using --someExclusiveBoolean=')
  })

  test('reports preset settings that do not match defaults', async () => {
    // Given
    const outputMock = mockAndCaptureOutput()
    outputMock.clear()

    // When
    await MockCommand.run(['--path', tmpDir, '--preset', 'presetWithDefaultOverride'])

    // Then
    expectFlags(tmpDir, 'presetWithDefaultOverride')
    expect(outputMock.info()).toMatchInlineSnapshot(`
      "Using applicable flags from the preset presetWithDefaultOverride:

      • someStringWithDefault = non-default stringy\n"
    `)
  })

  test('reports preset settings that match defaults', async () => {
    // Given
    const outputMock = mockAndCaptureOutput()
    outputMock.clear()

    // When
    await MockCommand.run(['--path', tmpDir, '--preset', 'presetMatchingDefault'])

    // Then
    expectFlags(tmpDir, 'presetMatchingDefault')
    expect(outputMock.info()).toMatchInlineSnapshot(`
      "Using applicable flags from the preset presetMatchingDefault:

      • someStringWithDefault = default stringy\n"
    `)
  })
})
