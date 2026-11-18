import { describe, expect, it } from 'vitest'
import { namesMatch } from './idCheck'

describe('namesMatch', () => {
  it('matches the same name in any case, with middle names on the ID', () => {
    expect(namesMatch('Ayush Shukla', 'AYUSH SHUKLA')).toBe(true)
    expect(namesMatch('Ayush Shukla', 'Ayush Kumar Shukla')).toBe(true)
    expect(namesMatch('Meera Joshi', 'Joshi Meera')).toBe(true)
  })
  it('refuses a different person, or a first name alone', () => {
    expect(namesMatch('Ayush Shukla', 'Ramesh Shukla')).toBe(false)
    expect(namesMatch('Ayush', 'Ayush Shukla')).toBe(false)
    expect(namesMatch('Ayush Kumar Shukla', 'Ayush Shukla')).toBe(false)
  })
})
