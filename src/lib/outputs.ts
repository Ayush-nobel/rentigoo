/**
 * amplify_outputs.json if it exists (written by `npx ampx sandbox` or the
 * Amplify build), without making it a hard import.
 */
export const outputs = Object.values(import.meta.glob('../../amplify_outputs.json', { eager: true, import: 'default' }))[0] as
  | { data?: unknown; storage?: { bucket_name: string; aws_region: string } }
  | undefined
