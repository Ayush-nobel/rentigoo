import { describe, expect, it } from 'vitest'
import { maskPhone, normaliseIndianMobile, otpMessage, phoneProblem } from './phone'

describe('normaliseIndianMobile', () => {
  it('accepts the usual ways people type a number', () => {
    for (const s of ['9876543210', '98765 43210', '+91 98765 43210', '+919876543210', '919876543210', '09876543210', '0091 98765-43210']) {
      expect(normaliseIndianMobile(s)).toBe('+919876543210')
    }
  })
  it('refuses landlines, short numbers and other countries', () => {
    for (const s of ['2551234', '12345', '5876543210', '+44 7911 123456', '98765432101', 'abc']) {
      expect(normaliseIndianMobile(s)).toBeNull()
    }
  })
  it('explains what’s wrong', () => {
    expect(phoneProblem('')).toMatch(/Enter your mobile/)
    expect(phoneProblem('123')).toMatch(/10-digit/)
    expect(phoneProblem('98765 43210')).toBeNull()
  })
})

it('masks all but the last four digits', () => {
  expect(maskPhone('+919876543210')).toBe('+91 ••••• •3210')
})

it('sends a message that names RentiGoo and warns not to share it', () => {
  expect(otpMessage('123456')).toBe('123456 is your RentiGoo verification code. It expires in 10 minutes. Do not share it with anyone.')
})
