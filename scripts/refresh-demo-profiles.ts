/**
 * Signs in as each seeded demo person and calls createMyProfile, which brings
 * older profiles up to date (public name, email badge). Sandbox only.
 *   set -a; . ./.env.seed; set +a; npx tsx --tsconfig amplify/tsconfig.json scripts/refresh-demo-profiles.ts
 */
import { readFileSync } from 'node:fs'
import { Amplify } from 'aws-amplify'
import { signIn, signOut } from 'aws-amplify/auth'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'
import { LEGAL } from '../shared/legal'
import { USERS } from '../src/data/users'

const password = process.env.SEED_PASSWORD
if (!password) throw new Error('Set SEED_PASSWORD (see .env.seed)')
Amplify.configure(JSON.parse(readFileSync('amplify_outputs.json', 'utf8')))
const client = generateClient<Schema>()

for (const u of USERS) {
  await signOut().catch(() => {})
  await signIn({ username: `${u.id.replace(/^u-/, '')}.demo@example.com`, password })
  const r = await client.mutations.createMyProfile({ name: u.name, areaId: u.areaId, termsVersion: LEGAL.terms.version, privacyVersion: LEGAL.privacy.version })
  console.log(r.errors?.length ? `✗ ${u.name}: ${r.errors[0]!.message}` : `✓ ${u.name} → shown as "${r.data?.displayName}"`)
}
await signOut()
