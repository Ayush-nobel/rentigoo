/**
 * ID checks through DigiLocker: the person shares their Aadhaar from DigiLocker;
 * we check the name on it matches their profile and give an "ID checked" badge.
 * We keep only: that it was checked, when, and a keyed fingerprint so one ID
 * can't check many accounts. Never the Aadhaar number, date of birth, address or photo.
 */

const words = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)

/**
 * Does the name on the ID match the profile name? Every word of the profile name
 * must appear in the ID name (so "Ayush Shukla" matches "AYUSH KUMAR SHUKLA"),
 * and there must be at least a first and a last name.
 */
export function namesMatch(profileName: string, idName: string): boolean {
  const mine = words(profileName)
  const id = new Set(words(idName))
  return mine.length >= 2 && mine.every((w) => id.has(w))
}
