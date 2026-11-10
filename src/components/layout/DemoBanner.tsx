import { DATA_MODE } from '@/lib'

/** True when the people, listings and reviews on screen are test data. */
const SHOWING_DEMO_DATA = DATA_MODE === 'mock' || import.meta.env.VITE_DEMO_DATA === 'true'

/**
 * Made-up reviews shown as real would be fake reviews. Whenever demo data is
 * on screen, say so plainly. Production builds refuse demo data (check:launch).
 */
export function DemoBanner() {
  if (!SHOWING_DEMO_DATA) return null
  return (
    <p role="note" className="bg-ink px-4 py-2 text-center text-[0.9375rem] font-medium text-on-ink">
      Test version: the people, listings and reviews you see are made up for testing. Nothing here is a real rental.
    </p>
  )
}
