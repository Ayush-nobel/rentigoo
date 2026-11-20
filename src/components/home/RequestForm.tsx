import { MessageCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AREAS, LAUNCH_CITY } from '@shared/areas'
import { normaliseIndianMobile } from '@shared/phone'
import { POLICY } from '@shared/policy'
import { whatsappUrl } from '@/config/business'
import { Button } from '../ui/Button'
import { SelectField, TextField } from '../ui/Field'

/** The areas people pick most; anything else is "Other". */
const BOARD_AREAS = ['mp-nagar', 'arera-colony', 'new-market', 'shahpura', 'kolar-road', 'habibganj']

/**
 * The request board: writes a WhatsApp message to us with what, when, where and
 * who. Nothing is sent to or stored by RentiGoo's site; the person sends it
 * from their own WhatsApp, and we try to find someone nearby who has it.
 */

export function RequestForm({ intro, defaultWhat = '' }: { intro?: string; defaultWhat?: string }) {
  const [what, setWhat] = useState(defaultWhat)
  const [dates, setDates] = useState('')
  const [area, setArea] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<{ what?: string; phone?: string }>({})
  const base = whatsappUrl()
  if (!base) return null

  const send = (e: FormEvent) => {
    e.preventDefault()
    const errs: typeof errors = {}
    if (what.trim().length < 2) errs.what = 'Tell us what you’re looking for.'
    if (phone.trim() && !normaliseIndianMobile(phone)) errs.phone = 'Enter a 10-digit mobile number, or leave it empty.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const areaName = area === 'other' ? 'Other' : AREAS.find((a) => a.id === area)?.name
    const lines = [
      `Hi RentiGoo, I’d like to rent: ${what.trim()}`,
      dates.trim() && `Dates: ${dates.trim()}`,
      areaName && `Area: ${areaName}`,
      name.trim() && `Name: ${name.trim()}`,
      phone.trim() && `WhatsApp: ${phone.trim()}`,
    ].filter(Boolean)
    window.location.href = `${base}?text=${encodeURIComponent(lines.join('\n'))}`
  }

  return (
    <section aria-labelledby="need-title" className="card rounded-[24px] p-5 sm:p-8">
      <h2 id="need-title" className="text-2xl sm:text-3xl">
        Need something that isn’t listed yet?
      </h2>
      <p className="mt-2 max-w-xl text-muted">
        {intro ?? `Tell us what you’re looking for in ${LAUNCH_CITY}, and we’ll try to find an owner for you within ${POLICY.requestReplyHours} hours.`}
      </p>
      <form noValidate onSubmit={send} className="mt-6 grid gap-4 sm:grid-cols-2">
        <TextField
          className="sm:col-span-2"
          label="What do you need?"
          placeholder="e.g. DSLR camera, camping tent, party speaker"
          value={what}
          error={errors.what}
          onChange={(e) => setWhat(e.target.value)}
        />
        <TextField label="Dates" hint="Optional" placeholder="e.g. 14–16 Dec, or this Saturday" value={dates} onChange={(e) => setDates(e.target.value)} />
        <SelectField label="Area" value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">Choose your area</option>
          {BOARD_AREAS.map((id) => (
            <option key={id} value={id}>
              {AREAS.find((a) => a.id === id)?.name ?? id}
            </option>
          ))}
          <option value="other">Other</option>
        </SelectField>
        <TextField label="Your name" hint="Optional" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField
          label="WhatsApp number"
          hint="Optional, if it’s not the one you’ll message from"
          prefix="+91"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={phone}
          error={errors.phone}
          onChange={(e) => setPhone(e.target.value)}
        />
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
