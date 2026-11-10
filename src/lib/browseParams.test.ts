import { describe, expect, it } from 'vitest'
import { activeFilterCount, parseBrowseParams, toBrowseParams } from './browseParams'

const parse = (qs: string) => parseBrowseParams(new URLSearchParams(qs))

describe('browse params', () => {
  it('round-trips every filter', () => {
    const f = {
      q: 'tent',
      category: 'outdoor',
      areas: ['mp-nagar', 'kolar-road'],
      min: 100,
      max: 500,
      from: '2026-11-20',
      to: '2026-11-22',
      noDeposit: true,
      delivery: true,
      sort: 'price-asc' as const,
      page: 2,
    }
    expect(parseBrowseParams(toBrowseParams(f))).toEqual(f)
  })

  it('drops unknown areas, categories and sorts', () => {
    expect(parse('areas=mp-nagar,south-delhi,mp-nagar&category=spaceships&sort=random')).toEqual({ areas: ['mp-nagar'] })
  })

  it('swaps a reversed price range and ignores junk numbers', () => {
    expect(parse('min=900&max=100')).toEqual({ min: 100, max: 900 })
    expect(parse('min=abc&max=-5')).toEqual({})
  })

  it('needs both dates, in order, and real', () => {
    expect(parse('from=2026-11-20')).toEqual({})
    expect(parse('from=2026-11-22&to=2026-11-20')).toEqual({})
    expect(parse('from=2026-02-30&to=2026-03-02')).toEqual({})
  })

  it('omits defaults from the URL', () => {
    expect(toBrowseParams({ sort: 'relevance', page: 1 }).toString()).toBe('')
  })

  it('counts active filters', () => {
    expect(activeFilterCount(parse('q=drill&sort=newest'))).toBe(0)
    expect(activeFilterCount(parse('areas=mp-nagar,shahpura&delivery=1&min=100'))).toBe(4)
  })
})
