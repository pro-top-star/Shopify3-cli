import {generateRandomNameForSubdirectory} from './fs.js'
import {inTemporaryDirectory, writeFile} from './file.js'
import {takeRandomFromArray} from '../common/array.js'
import {join} from '../../path.js'
import {describe, expect, test, vi} from 'vitest'

vi.mock('../common/array.js')

describe('makeDirectoryWithRandomName', () => {
  test('rerolls the name if a directory exists with the same name', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      // Given
      vi.mocked(takeRandomFromArray).mockReturnValueOnce('taken')
      vi.mocked(takeRandomFromArray).mockReturnValueOnce('directory')
      vi.mocked(takeRandomFromArray).mockReturnValueOnce('free')
      vi.mocked(takeRandomFromArray).mockReturnValueOnce('directory')

      const content = 'test'
      const filePath = join(tmpDir, 'taken-directory-app')
      await writeFile(filePath, content)

      // When
      const got = await generateRandomNameForSubdirectory({suffix: 'app', directory: tmpDir})

      // Then
      expect(got).toEqual('free-directory-app')
      expect(takeRandomFromArray).toHaveBeenCalledTimes(4)
    })
  })
})
