/**
 * Phone number checks (India only for now). The number is used once, to send
 * a code; afterwards RentiGoo keeps only a keyed fingerprint of it.
 */

export const OTP = {
  length: 6,
  /** Minutes a code stays valid. */
  validMinutes: 10,
  /** Wrong guesses before a code stops working. */
  maxAttempts: 5,
  /** Seconds between sends. */
  resendSeconds: 60,
  /** Codes per account per day, and per number per day. */
  maxSendsPerDay: 5,
} as const

/**
 * An Indian mobile number in +91XXXXXXXXXX form, or null. Accepts spaces,
 * dashes, a leading 0, 91 or +91. Indian mobiles start with 6, 7, 8 or 9.
 */
export function normaliseIndianMobile(input: string): string | null {
  let d = input.replace(/[\s\-().]/g, '')
  if (d.startsWith('+91')) d = d.slice(3)
  else if (d.startsWith('0091')) d = d.slice(4)
  else if (d.length === 12 && d.startsWith('91')) d = d.slice(2)
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null
}

export function phoneProblem(input: string): string | null {
  if (!input.trim()) return 'Enter your mobile number.'
  return normaliseIndianMobile(input) ? null : 'Enter a 10-digit Indian mobile number, e.g. 98765 43210.'
}

/** The text sent by SMS. It must match the template registered on DLT word for word. */
export function otpMessage(code: string): string {
  return `${code} is your RentiGoo verification code. It expires in ${OTP.validMinutes} minutes. Do not share it with anyone.`
}

/** "+91 98765 43210" → "+91 ••••• •3210" for showing where a code went. */
export function maskPhone(e164: string): string {
  return `+91 ••••• •${e164.slice(-4)}`
}
