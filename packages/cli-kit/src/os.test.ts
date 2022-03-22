import {platformAndArch} from './os'
import {describe, it, expect, vi, afterEach} from 'vitest'
import {userInfo as osUserInfo, arch as osArch} from 'node:os'

vi.mock('node:os')
vi.mock('node:process')

afterEach(() => {
  vi.mocked(osUserInfo).mockClear()
  vi.mocked(osArch).mockClear()
})

describe('platformAndArch', () => {
  it("returns the right architecture when it's x64", () => {
    // Given
    vi.mocked(osArch).mockReturnValue('x64')

    // When
    const got = platformAndArch('darwin')

    // Got
    expect(got.platform).toEqual('darwin')
    expect(got.arch).toEqual('amd64')
  })

  it('returns the right architecture', () => {
    // Given
    vi.mocked(osArch).mockReturnValue('arm64')

    // When
    const got = platformAndArch('darwin')

    // Got
    expect(got.platform).toEqual('darwin')
    expect(got.arch).toEqual('arm64')
  })
})
