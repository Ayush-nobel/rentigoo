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
  grievanceOfficer: {
    name: string | null
    designation: string | null
    email: string | null
    phone: string | null
  }
  /** City whose courts handle disputes, usually where the business is registered. */
  jurisdictionCity: string | null
}

export const BUSINESS: BusinessDetails = {
  legalName: null,
  entityType: null,
  registrationNumber: null,
  gstin: null,
  address: null,
  branches: [],
  supportEmail: null,
  supportPhone: null,
  grievanceOfficer: { name: null, designation: null, email: null, phone: null },
  jurisdictionCity: null,
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
