import { BadgeCheck, MapPin, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { areaName } from '@shared/areas'
import type { UserProfile } from '@shared/types'
import { useAuth } from '@/context/AuthContext'
import { api, ApiError } from '@/lib'
import { monthYear } from '@/lib/format'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Rating } from '../ui/Rating'

function replyTime(hrs: number) {
  if (hrs <= 1) return 'within an hour'
  if (hrs < 24) return `within ${hrs} hours`
  return 'within a day'
}

export function OwnerCard({ owner, listingId }: { owner: UserProfile; listingId: string }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isMe = user?.id === owner.id
  const firstName = owner.name.split(' ')[0]

  const message = async () => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/listing/${listingId}`)}`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const c = await api.openConversation(listingId, owner.id)
      navigate(`/messages/${c.id}`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t open a chat. Please try again.')
      setBusy(false)
    }
  }

  const checks = [
    { ok: owner.verified.govtId, label: 'Government ID checked' },
    { ok: owner.verified.phone, label: 'Phone number checked' },
    { ok: owner.verified.email, label: 'Email checked' },
  ].filter((c) => c.ok)

  return (
    <section aria-labelledby="owner-title" className="rounded-[24px] border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <Avatar name={owner.name} src={owner.avatarKey} size="lg" />
        <div>
          <h2 id="owner-title" className="text-2xl">
            Rented out by {firstName}
          </h2>
          <p className="flex items-center gap-1 text-muted">
            <MapPin aria-hidden="true" className="size-4" /> {areaName(owner.areaId)}, on RentiGoo since {monthYear(owner.joinedAt)}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-[0.9375rem] text-muted">Rating</dt>
          <dd className="mt-0.5">
            <Rating value={owner.ratingAvg} count={owner.ratingCount} className="text-base" />
          </dd>
        </div>
        {owner.responseTimeHrs !== null && (
          <div>
            <dt className="text-[0.9375rem] text-muted">Usually replies</dt>
            <dd className="mt-0.5 font-semibold">{replyTime(owner.responseTimeHrs)}</dd>
          </div>
        )}
      </dl>

      {checks.length > 0 && (
        <ul className="mt-5 space-y-1.5">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2">
              <BadgeCheck aria-hidden="true" className="size-5 text-success" /> {c.label}
            </li>
          ))}
        </ul>
      )}

      {owner.bio && <p className="mt-5">{owner.bio}</p>}
      {owner.languages.length > 0 && <p className="mt-2 text-muted">Speaks {owner.languages.join(', ')}</p>}

      {!isMe && (
        <>
          <Button variant="outline" className="mt-5" onClick={message} disabled={busy} icon={<MessageCircle aria-hidden="true" className="size-5" />}>
            {busy ? 'Opening chat…' : `Message ${firstName}`}
          </Button>
          {error && (
            <p role="alert" className="mt-2 font-medium text-danger">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  )
}
