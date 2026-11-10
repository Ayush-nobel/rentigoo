/**
 * Who is signed in, as far as the data layer is concerned. AuthContext keeps
 * this in sync. The Amplify adapter ignores it and uses the Cognito token.
 */
let currentUserId: string | null = null

export function getSessionUserId(): string | null {
  return currentUserId
}

export function setSessionUserId(id: string | null): void {
  currentUserId = id
}
