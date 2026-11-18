import { MessageCircle } from 'lucide-react'
import { LAUNCH_CITY } from '@shared/areas'
import { BUSINESS, FOUNDER, whatsappUrl } from '@/config/business'

const WHATSAPP = whatsappUrl()

/**
 * "Who's behind RentiGoo": a real person to talk to. The photo and story come
 * from FOUNDER in src/config/business.ts and only appear once filled in; until
 * then it shows initials and facts we already publish. Never a made-up bio.
 */
export function FounderBlock() {
  const initials = FOUNDER.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
  return (
    <section aria-labelledby="founder-title" className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="grid items-center gap-6 rounded-[24px] bg-sunken p-6 sm:grid-cols-[auto_1fr] sm:gap-8 sm:p-8">
        {FOUNDER.photo ? (
          <img src={FOUNDER.photo} alt={FOUNDER.name} width={128} height={128} className="size-28 rounded-full object-cover sm:size-32" />
        ) : (
          <span aria-hidden="true" className="grid size-28 place-items-center rounded-full bg-accent font-display text-4xl font-semibold text-on-accent sm:size-32">
            {initials}
          </span>
        )}
        <div>
          <h2 id="founder-title" className="text-3xl sm:text-4xl">
            Who’s behind RentiGoo
          </h2>
          <p className="mt-2 text-lg">
            {FOUNDER.name}
            {BUSINESS.grievanceOfficer.designation ? `, ${BUSINESS.grievanceOfficer.designation}` : ''}
          </p>
          {FOUNDER.story ? (
            <p className="mt-2 max-w-2xl text-muted">{FOUNDER.story}</p>
          ) : (
            <p className="mt-2 max-w-2xl text-muted">RentiGoo is run from {LAUNCH_CITY}. If you have a question, a problem or an idea, you can reach me directly.</p>
          )}
          {WHATSAPP && (
            <a
              href={WHATSAPP}
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 font-semibold text-on-ink hover:opacity-90"
            >
              <MessageCircle aria-hidden="true" className="size-5" />
              WhatsApp me directly
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
