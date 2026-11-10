import { describe, expect, it } from 'vitest'
import { emailProblem, nameProblem, passwordChecks, passwordProblem, profileProblem, tidyName } from './accountRules'

describe('passwords (Cognito policy)', () => {
  it('accepts a strong password', () => {
    expect(passwordProblem('Bhopal@2026')).toBeNull()
  })
  it('lists exactly what is missing', () => {
    expect(passwordChecks('bhopal').filter((c) => !c.ok).map((c) => c.id)).toEqual(['length', 'upper', 'number', 'symbol'])
    expect(passwordProblem('Bhopal2026')).toMatch(/symbol/)
  })
  it('only counts symbols Cognito accepts (not ₹)', () => {
    expect(passwordProblem('Lakes₹2026')).toMatch(/symbol/)
    for (const s of ['^', '$', '*', '.', '[', ']', '{', '}', '(', ')', '?', '-', '"', '!', '@', '#', '%', '&', '/', '\\', ',', '>', '<', "'", ':', ';', '|', '_', '~', '`', '+', '=']) {
      expect(passwordProblem(`Lakes2026${s}`), s).toBeNull()
    }
  })
  it('refuses leading or trailing spaces', () => {
    expect(passwordProblem(' Bhopal@2026')).toMatch(/space/)
  })
})

describe('email', () => {
  it('accepts normal addresses and refuses incomplete ones', () => {
    expect(emailProblem('ananya@example.com')).toBeNull()
    expect(emailProblem('ananya@example')).toMatch(/complete/)
    expect(emailProblem('')).toMatch(/Enter/)
  })
})

describe('profile', () => {
  it('needs a real name and a Bhopal area', () => {
    expect(profileProblem({ name: 'Ananya Gupta', areaId: 'kolar-road' })).toBeNull()
    expect(profileProblem({ name: 'A', areaId: 'kolar-road' })).toMatch(/name/)
    expect(profileProblem({ name: 'Ananya', areaId: 'south-delhi' })).toMatch(/area/)
  })
  it('refuses links and markup in names', () => {
    expect(nameProblem('Visit http://spam.example')).toMatch(/links/)
    expect(nameProblem('<script>')).toMatch(/symbols/)
  })
  it('tidies spacing', () => {
    expect(tidyName('  Ananya   Gupta ')).toBe('Ananya Gupta')
  })
})
