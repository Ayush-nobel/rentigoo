import { describe, expect, it } from 'vitest'
import { bookingProblem, canTransition } from './bookingRules'

const listing = {
  ownerId: 'owner',
  status: 'active' as const,
  minDays: 2,
  maxDays: 7,
  pickupOptions: ['pickup' as const],
  blockedDates: ['2026-11-20'],
}
const today = '2026-11-10'
const ok = { start: '2026-11-12', end: '2026-11-14', delivery: false }

describe('bookingProblem', () => {
  it('accepts a valid request', () => {
    expect(bookingProblem(listing, ok, 'renter', today)).toBeNull()
  })
  it('refuses own listing, paused listing and past dates', () => {
    expect(bookingProblem(listing, ok, 'owner', today)).toMatch(/own listing/)
    expect(bookingProblem({ ...listing, status: 'paused' }, ok, 'renter', today)).toMatch(/isn’t taking/)
    expect(bookingProblem(listing, { ...ok, start: '2026-11-09' }, 'renter', today)).toMatch(/passed/)
  })
  it('enforces min and max days', () => {
    expect(bookingProblem(listing, { ...ok, end: '2026-11-13' }, 'renter', today)).toMatch(/at least 2/)
    expect(bookingProblem(listing, { ...ok, end: '2026-11-30' }, 'renter', today)).toMatch(/up to 7/)
  })
  it('refuses delivery when not offered', () => {
    expect(bookingProblem(listing, { ...ok, delivery: true }, 'renter', today)).toMatch(/doesn’t deliver/)
  })
  it('refuses booked dates', () => {
    expect(bookingProblem(listing, { start: '2026-11-19', end: '2026-11-22', delivery: false }, 'renter', today)).toMatch(/already booked/)
  })
  it('refuses garbage dates', () => {
    expect(bookingProblem(listing, { ...ok, start: 'tomorrow' }, 'renter', today)).toMatch(/don’t look right/)
  })
})

describe('canTransition', () => {
  const b = { status: 'requested' as const, ownerId: 'owner', renterId: 'renter' }
  it('only the owner accepts or declines a request', () => {
    expect(canTransition(b, 'accepted', 'owner')).toBe(true)
    expect(canTransition(b, 'accepted', 'renter')).toBe(false)
    expect(canTransition(b, 'declined', 'stranger')).toBe(false)
  })
  it('renter can cancel before pickup', () => {
    expect(canTransition(b, 'cancelled', 'renter')).toBe(true)
    expect(canTransition({ ...b, status: 'active' }, 'cancelled', 'renter')).toBe(false)
  })
  it('cannot accept twice', () => {
    expect(canTransition({ ...b, status: 'accepted' }, 'accepted', 'owner')).toBe(false)
  })
})
