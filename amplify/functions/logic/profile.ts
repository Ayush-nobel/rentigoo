import { profileProblem, tidyName } from '../../../shared/accountRules'
import { LEGAL, publicName } from '../../../shared/legal'
import { RuleError } from './bookings'

export interface ProfileRow {
  id: string
  userId: string
  name: string
  displayName?: string | null
  areaId: string
  verifiedEmail?: boolean | null
}

export interface NewProfileRow extends ProfileRow {
  displayName: string
  verifiedEmail: boolean
  languages: string[]
  bio: string
  termsVersion: string
  privacyVersion: string
  consentAt: string
}

export interface ProfileStore {
  getProfile(id: string): Promise<ProfileRow | null>
  createProfile(row: NewProfileRow): Promise<ProfileRow>
  /** Server-owned fields only (badge and public name). */
  updateServerFields(id: string, fields: { verifiedEmail?: boolean; displayName?: string }): Promise<ProfileRow>
}

export interface CreateProfileInput {
  name: string
  areaId: string
  /** The Terms and Privacy versions the person ticked to agree to. */
  termsVersion: string
  privacyVersion: string
}

/**
 * Creates the caller's profile once, recording which Terms and Privacy Policy
 * versions they agreed to and when. Calling again returns the existing one
 * (and refreshes the email badge from Cognito), so retries are harmless.
 */
export async function createMyProfile(
  store: ProfileStore,
  input: CreateProfileInput,
  callerId: string,
  emailVerified: boolean,
  now = new Date(),
): Promise<ProfileRow> {
  const existing = await store.getProfile(callerId)
  if (existing) {
    // Bring older profiles up to date: email badge from Cognito, public name if missing.
    const fields: { verifiedEmail?: boolean; displayName?: string } = {}
    if (Boolean(existing.verifiedEmail) !== emailVerified) fields.verifiedEmail = emailVerified
    if (!existing.displayName && existing.name) fields.displayName = publicName(existing.name)
    return Object.keys(fields).length ? store.updateServerFields(callerId, fields) : existing
  }
  if (input.termsVersion !== LEGAL.terms.version || input.privacyVersion !== LEGAL.privacy.version) {
    throw new RuleError('Please agree to the latest Terms and Privacy Policy to continue. Refresh the page if you had it open for a while.')
  }
  const name = tidyName(input.name)
  const problem = profileProblem({ name, areaId: input.areaId })
  if (problem) throw new RuleError(problem)
  return store.createProfile({
    id: callerId,
    userId: callerId,
    name,
    displayName: publicName(name),
    areaId: input.areaId,
    verifiedEmail: emailVerified,
    languages: [],
    bio: '',
    termsVersion: input.termsVersion,
    privacyVersion: input.privacyVersion,
    consentAt: now.toISOString(),
  })
}
