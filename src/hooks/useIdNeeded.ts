import { useAuth } from '@/context/AuthContext'
import { ID_CHECK_LIVE } from '@/lib/features'

/** Where to go after DigiLocker sends the person back (read by the /account/id-check page). */
export const ID_NEXT_KEY = 'rentigoo-id-next'

/**
 * True when this signed-in person must check their ID before listing or renting:
 * only once ID checks are switched on (Setu keys set), and only until they've done it.
 */
export function useIdNeeded(): boolean {
  const { user } = useAuth()
  return ID_CHECK_LIVE && Boolean(user) && !user!.verified.govtId
}
