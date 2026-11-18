/**
 * The business behind RentiGoo. Indian law (Consumer Protection (E-Commerce)
 * Rules 2020, IT Rules 2021, DPDP Act 2023) requires these to be shown on the
 * site. Fill every null before launch: `npm run check:launch` fails until you do.
 * Never put made-up values here.
 */
export interface BusinessDetails {
  /** Registered legal name, e.g. "RentiGoo Technologies Private Limited". */
  legalName: string | null
  /** Sole proprietorship, partnership, LLP, private limited company… */
  entityType: string | null
  /** CIN or LLPIN, if a company or LLP. */
  registrationNumber: string | null
  /** GSTIN, if registered. Required before charging GST on the service fee. */
  gstin: string | null
  /** Registered / principal office address, in full. */
  address: string | null
  /** Branch addresses, if any (the E-Commerce Rules require all of them). */
  branches: string[]
  supportEmail: string | null
  supportPhone: string | null
  /** WhatsApp number with country code, digits only (for wa.me links). */
  whatsapp: string | null
  grievanceOfficer: {
    name: string | null
    designation: string | null
    email: string | null
    phone: string | null
  }
  /** City whose courts handle disputes, usually where the business is registered. */
  jurisdictionCity: string | null
}

// Provided by the founder on 2026-11-10. An unregistered business run by one
// person is in law a sole proprietorship: the legal person is the proprietor.
export const BUSINESS: BusinessDetails = {
  legalName: 'RentiGoo Technologies (proprietor: Ayush Shukla)',
  entityType: 'Sole proprietorship, not registered as a company',
  registrationNumber: null,
  gstin: null, // Not GST-registered: no GST may be charged (see shared/fees.ts).
  // Founder's home address, published at their choice (2026-11-10). Swap for a business address any time.
  address: 'Flat FF-2, Mahaveer Apartments, K-Sector, Ayodhya Bypass, Bhopal, Madhya Pradesh 462041',
  branches: [],
  supportEmail: 'support@rentigoo.in',
  supportPhone: '+91 93014 22919',
  // Founder's number, for WhatsApp and calls (given 2026-11-18).
  whatsapp: '919301422919',
  grievanceOfficer: {
    name: 'Ayush Shukla',
    designation: 'Founder and CEO',
    email: 'support@rentigoo.in',
    phone: '+91 93014 22919',
  },
  jurisdictionCity: 'Bhopal',
}

/** Fields that must be filled before launch (GSTIN and registration number are conditional). */
export function missingBusinessDetails(b: BusinessDetails = BUSINESS): string[] {
  const missing: string[] = []
  const need: [string, string | null][] = [
    ['legal name', b.legalName],
    ['entity type', b.entityType],
    ['registered address', b.address],
    ['support email', b.supportEmail],
    ['support phone', b.supportPhone],
    ['grievance officer name', b.grievanceOfficer.name],
    ['grievance officer designation', b.grievanceOfficer.designation],
    ['grievance officer email', b.grievanceOfficer.email],
    ['grievance officer phone', b.grievanceOfficer.phone],
    ['jurisdiction city', b.jurisdictionCity],
  ]
  for (const [label, v] of need) if (!v || !v.trim()) missing.push(label)
  return missing
}

/** Show a value, or a clearly marked gap (never a guess). */
export function shown(v: string | null, label: string): string {
  return v && v.trim() ? v : `[${label} to be added]`
}

/** A link that opens a WhatsApp chat with us, or null if there's no number. */
export function whatsappUrl(b: BusinessDetails = BUSINESS): string | null {
  return b.whatsapp ? `https://wa.me/${b.whatsapp}` : null
}

/** The person behind RentiGoo, for the "Who's behind RentiGoo" block on Home. */
export const FOUNDER: { name: string; photo: string | null; story: string | null } = {
  name: 'Ayush Shukla',
  // TODO(founder): add a real photo of yourself at public/brand/founder.webp (square, at least 400 px wide)
  // and set photo: '/brand/founder.webp'. Until then the block shows your initials.
  photo: null,
  // TODO(founder): 2–3 lines in your own words: who you are and why you started RentiGoo in Bhopal.
  // Until then the block shows only facts we already publish (your name, that RentiGoo is run from Bhopal).
  story: null,
}
