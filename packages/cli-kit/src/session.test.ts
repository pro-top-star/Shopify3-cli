import {vi, describe, expect, it} from 'vitest'

import {ensureAuthenticated} from './session'
import {clientId} from './session/identity'
import {identity} from './environment/fqdn'

vi.mock('./environment/fqdn')
vi.mock('./session/identity')
vi.mock('./session/authorize')

describe('ensureAuthenticated', () => {
  it('handles authentication', async () => {
    // Given
    // WIP
    const oauth = {}

    // When
    await ensureAuthenticated(oauth)

    // Then
    expect(identity).toBeCalled()
    expect(clientId).toBeCalled()
  })
})
