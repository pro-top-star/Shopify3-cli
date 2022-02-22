import {describe, it, expect, vi} from 'vitest'

import initService from '../services/init'
import initPrompt from '../prompts/init'

import Init from './init'

vi.mock('../utils/paths')
vi.mock('../services/init')
vi.mock('../prompts/init')

const initServiceMock = vi.mocked(initService)
const initPromptMock = vi.mocked(initPrompt)

describe('Init', function () {
  it('initializes the template using the service', async function () {
    // Given
    const directory = '/path/to/output'
    const appName = 'MyApp'

    initPromptMock.mockReturnValue(Promise.resolve({name: appName}))

    // When
    await Init.run(['--name', appName, '--path', directory])

    // Then
    expect(initServiceMock).toHaveBeenCalledWith({
      name: appName,
      directory,
    })
    expect(initPromptMock).toHaveBeenCalledWith({
      name: appName,
    })
  })
})
