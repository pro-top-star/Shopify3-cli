import {npm} from '.'
import * as os from './public/node/os.js'
import {updateAppData} from './npm.js'
import {inTemporaryDirectory} from './public/node/fs.js'
import * as file from './public/node/fs.js'
import {joinPath} from './public/node/path.js'
import {describe, it, expect, vi} from 'vitest'

vi.mock('os')
vi.mock('process')

describe('readPackageJSON()', () => {
  async function mockPackageJSON(callback: (tmpDir: string) => Promise<void>) {
    await inTemporaryDirectory(async (tmpDir) => {
      const packageJSON = {name: 'mock name'}
      await file.writeFile(joinPath(tmpDir, 'package.json'), JSON.stringify(packageJSON))

      return callback(tmpDir)
    })
  }

  it('reads the package.json and returns it parsed', async () => {
    await mockPackageJSON(async (tmpDir: string) => {
      const packageJSON = await npm.readPackageJSON(tmpDir)

      expect(packageJSON).toEqual({name: 'mock name'})
    })
  })
})

describe('writePackageJSON()', () => {
  it('writes the package.json and returns it parsed', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      vi.spyOn(file, 'writeFile')

      const packageJSON = {name: 'mock name'}
      await npm.writePackageJSON(tmpDir, packageJSON)

      const filePath = joinPath(tmpDir, 'package.json')
      const content = '{\n  "name": "mock name"\n}'

      expect(file.writeFile).toHaveBeenCalledWith(filePath, content)
    })
  })
})

describe('updateAppData()', () => {
  it('updates the name', async () => {
    const packageJSON = {} as {name: string}
    await updateAppData(packageJSON, 'mock name')

    expect(packageJSON.name).toBe('mock name')
  })

  it('updates the author', async () => {
    const packageJSON = {} as {author: string}

    vi.spyOn(os, 'username').mockImplementation(async () => 'mock os.username')

    await updateAppData(packageJSON, '')

    expect(packageJSON.author).toBe('mock os.username')
  })
})
