import { getArea } from './areas'

/** Mirrors the Cognito password policy in amplify_outputs.json. */
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'upper', label: 'A capital letter', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'A small letter', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'A number', test: (p: string) => /\d/.test(p) },
  // Only Cognito's own symbol list counts (₹ and emoji don't).
  { id: 'symbol', label: 'A symbol, like ! @ # $ or %', test: (p: string) => /[\^$*.[\]{}()?\-"!@#%&/\\,><':;|_~`+=]/.test(p) },
] as const

export function passwordChecks(password: string) {
  return PASSWORD_RULES.map((r) => ({ id: r.id, label: r.label, ok: r.test(password) }))
}

export function passwordProblem(password: string): string | null {
  if (/^\s|\s$/.test(password)) return 'Your password can’t start or end with a space.'
  const missing = passwordChecks(password).filter((c) => !c.ok)
  return missing.length ? `Your password needs: ${missing.map((m) => m.label.toLowerCase()).join(', ')}.` : null
}

export function emailProblem(email: string): string | null {
  const e = email.trim()
  if (!e) return 'Enter your email address.'
  // Deliberately loose: the emailed code is the real check.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return 'That email address doesn’t look complete.'
  if (e.length > 254) return 'That email address is too long.'
  return null
}

export function nameProblem(name: string): string | null {
  const n = name.trim()
  if (n.length < 2) return 'Tell us your name (at least 2 letters).'
  if (n.length > 60) return 'Keep your name under 60 characters.'
  if (/[<>{}[\]\\/@]|https?:/i.test(n)) return 'Use just your name, without links or symbols.'
  return null
}

export function areaProblem(areaId: string): string | null {
  return getArea(areaId) ? null : 'Choose the area you live in.'
}

export interface ProfileInput {
  name: string
  areaId: string
}

/** First problem with a new profile, or null. Used by the form and the server. */
export function profileProblem(input: ProfileInput): string | null {
  return nameProblem(input.name) ?? areaProblem(input.areaId)
}

/** Collapse inner whitespace and trim, so "  Ananya   Gupta " becomes "Ananya Gupta". */
export function tidyName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}
