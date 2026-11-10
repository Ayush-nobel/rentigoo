/**
 * Refuses a production build that isn't ready to face the public.
 * Runs in the Amplify build for the production branch (see amplify.yml).
 *   npx tsx scripts/check-launch.ts
 */
import { missingBusinessDetails } from '../src/config/business'

const problems: string[] = []
const env = process.env

const missing = missingBusinessDetails()
if (missing.length) problems.push(`Business details missing in src/config/business.ts: ${missing.join(', ')}.`)
if (env.VITE_DATA_MODE !== 'amplify') problems.push('VITE_DATA_MODE must be "amplify" (demo data must never go live).')
if (env.VITE_DEMO_DATA === 'true') problems.push('VITE_DEMO_DATA is on: production must not show seeded test data.')

if (problems.length) {
  console.error('Not ready to launch:\n' + problems.map((p) => `  • ${p}`).join('\n'))
  process.exit(1)
}
console.log('Launch checks passed.')
