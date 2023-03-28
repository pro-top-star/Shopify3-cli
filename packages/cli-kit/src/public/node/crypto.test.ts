import {hashString} from './crypto.js'
import {describe, expect, test} from 'vitest'

describe('hashString', () => {
  test('converts a string to its consistent hash', () => {
    const hash1 = hashString('hello')
    const hash2 = hashString('hello')
    expect(hash1).toEqual(hash2)
    expect(hash1).toMatch(/[a-f0-9]{40}/)
  })
})
