import { RuleError } from './bookings'

/** The signed-in caller's Cognito sub, or an error if there isn't one. */
export function callerId(identity: unknown): string {
  const sub = (identity as { sub?: string } | null | undefined)?.sub
  if (!sub) throw new Error('Please log in to do that.')
  return sub
}

/** Today's date in India, as YYYY-MM-DD. */
export function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
}

/**
 * Rule problems go back to the person word for word. Anything else is logged
 * and replaced with a generic message so internals don't leak.
 */
export async function guarded<T>(name: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (e) {
    if (e instanceof RuleError) throw new Error(e.message)
    if (e instanceof Error && e.message === 'Please log in to do that.') throw e
    console.error(`${name} failed`, e)
    throw new Error('Something went wrong on our side. Please try again in a minute.')
  }
}
