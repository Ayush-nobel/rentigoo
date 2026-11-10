import { describe, expect, it } from 'vitest'
import { safeNext } from './auth'

describe('safeNext', () => {
  it('keeps paths on this site', () => {
    expect(safeNext('/listing/abc?x=1')).toBe('/listing/abc?x=1')
  })
  it('refuses anything that could leave the site', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '', null, undefined]) {
      expect(safeNext(bad as string)).toBe('/')
    }
  })
  it('uses the fallback', () => {
    expect(safeNext(null, '/dashboard')).toBe('/dashboard')
  })
})
