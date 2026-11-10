import { describe, expect, it } from 'vitest'
import { publicName } from './legal'

describe('publicName', () => {
  it('shows first name and last initial only', () => {
    expect(publicName('Meera Joshi')).toBe('Meera J.')
    expect(publicName('  Ananya   Devi  Gupta ')).toBe('Ananya G.')
    expect(publicName('Kabir')).toBe('Kabir')
    expect(publicName('')).toBe('RentiGoo member')
  })
})
