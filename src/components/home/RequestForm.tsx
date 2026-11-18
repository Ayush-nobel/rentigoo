import { MessageCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AREAS, LAUNCH_CITY } from '@shared/areas'
import { whatsappUrl } from '@/config/business'
import { Button } from '../ui/Button'
import { SelectField, TextField } from '../ui/Field'

/**
 * "Tell us what you need": writes a WhatsApp message to us with what, where and
 * when. Nothing is sent to or stored by RentiGoo's site; the person sends it
 * from their own WhatsApp, and we find someone nearby who has it.
 */
export function RequestForm({ intro, defaultWhat = '' }: { intro?: string; defaultWhat?: string }) {
  const [what, setWhat] = useState(defaultWhat)
  const [area, setArea] = useState('')
  const [when, setWhen] = useState('')
  const [error, setError] = useState<string | null>(null)
  const base = whatsappUrl()
  if (!base) return null

  const send = (e: FormEvent) => {
    e.preventDefault()
    if (what.trim().length < 2) return setError('Tell us what you’re looking for.')
    setError(null)
    const areaName = AREAS.find((a) => a.id === area)?.name
    const lines = [`Hi RentiGoo, I’d like to rent: ${what.trim()}`, areaName && `Area: ${areaName}`, when.trim() && `When: ${when.trim()}`].filter(Boolean)
    window.location.href = `${base}?text=${encodeURIComponent(lines.join('\n'))}`
  }

  return (
    <section aria-labelledby="need-title" className="rounded-[24px] bg-sunken p-5 sm:p-8">
      <h2 id="need-title" className="text-2xl sm:text-3xl">
        Tell us what you need
      </h2>
      <p className="mt-2 max-w-xl text-muted">{intro ?? `Tell us on WhatsApp what you’re looking for, and we’ll find someone in ${LAUNCH_CITY} who has it.`}</p>
      <form noValidate onSubmit={send} className="mt-6 grid gap-4 sm:grid-cols-2">
        <TextField
          className="sm:col-span-2"
          label="What do you need?"
          placeholder="e.g. DSLR camera, camping tent, party speaker"
          value={what}
          error={error ?? undefined}
          onChange={(e) => setWhat(e.target.value)}
        />
        <SelectField label="Your area" value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">Anywhere in {LAUNCH_CITY}</option>
          {AREAS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </SelectField>
        <TextField label="When?" hint="Optional" placeholder="e.g. this Saturday, for 2 days" value={when} onChange={(e) => setWhen(e.target.value)} />
        <div className="sm:col-span-2">
          <Button type="submit" size="lg" icon={<MessageCircle aria-hidden="true" className="size-5" />}>
            Send on WhatsApp
          </Button>
          <p className="mt-2 text-[0.9375rem] text-muted">Opens WhatsApp with your message written. Nothing is saved on this site.</p>
        </div>
      </form>
    </section>
  )
}
