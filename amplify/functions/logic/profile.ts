import { profileProblem, tidyName } from '../../../shared/accountRules'
import { RuleError } from './bookings'

export interface ProfileRow {
  id: string
  userId: string
  name: string
  areaId: string
  verifiedEmail?: boolean | null
}

export interface ProfileStore {
  getProfile(id: string): Promise<ProfileRow | null>
  createProfile(row: Omit<ProfileRow, 'verifiedEmail'> & { verifiedEmail: boolean; languages: string[]; bio: string }): Promise<ProfileRow>
  setVerifiedEmail(id: string, verified: boolean): Promise<ProfileRow>
}

/**
 * Creates the caller's profile once. Calling again returns the existing one
 * (and refreshes the verified-email badge), so a retry after a network blip
 * is harmless. The badge comes from Cognito's user record, never the browser.
 */
export async function createMyProfile(
  store: ProfileStore,
  input: { name: string; areaId: string },
  callerId: string,
  emailVerified: boolean,
): Promise<ProfileRow> {
  const existing = await store.getProfile(callerId)
  if (existing) {
    return Boolean(existing.verifiedEmail) === emailVerified ? existing : store.setVerifiedEmail(callerId, emailVerified)
  }
  const name = tidyName(input.name)
  const problem = profileProblem({ name, areaId: input.areaId })
  if (problem) throw new RuleError(problem)
  return store.createProfile({ id: callerId, userId: callerId, name, areaId: input.areaId, verifiedEmail: emailVerified, languages: [], bio: '' })
}
