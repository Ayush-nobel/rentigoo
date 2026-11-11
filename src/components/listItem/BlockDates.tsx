import { DayPicker } from 'react-day-picker'
import { enIN } from 'react-day-picker/locale'
import type { ISODate } from '@shared/types'
import { Button } from '@/components/ui/Button'
import { isoToLocalDate, localDateToISO } from '@/lib/dates'
import { shortDate } from '@/lib/format'

interface Props {
  today: ISODate
  value: ISODate[]
  onChange: (days: ISODate[]) => void
  /** Days already booked by renters: shown, but not changeable here. */
  booked: ISODate[]
}

/** Tap days to keep them for yourself; tap again to free them. */
export function BlockDates({ today, value, onChange, booked }: Props) {
  const todayDate = isoToLocalDate(today)
  const upcoming = value.filter((d) => d >= today).sort()
  return (
    <div>
      <DayPicker
        mode="multiple"
        className="block-dates"
        locale={enIN}
        selected={upcoming.map(isoToLocalDate)}
        onSelect={(days) => onChange((days ?? []).map(localDateToISO).sort())}
        disabled={[{ before: todayDate }, ...booked.map(isoToLocalDate)]}
        startMonth={todayDate}
        endMonth={new Date(todayDate.getFullYear() + 1, todayDate.getMonth())}
        weekStartsOn={1}
      />
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.9375rem] text-muted">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-ink text-xs font-bold text-on-ink">
            12
          </span>
          Blocked by you
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="line-through decoration-[1.5px]">
            12
          </span>
          Past{booked.length ? ', or booked by a renter' : ''}
        </span>
      </div>
      <p role="status" className="mt-3">
        {upcoming.length === 0
          ? 'No days blocked: renters can ask for any day.'
          : `${upcoming.length} ${upcoming.length === 1 ? 'day' : 'days'} blocked${upcoming.length <= 6 ? `: ${upcoming.map(shortDate).join(', ')}` : ''}.`}
      </p>
      {upcoming.length > 0 && (
        <Button size="sm" variant="ghost" className="mt-1 -ml-4 underline underline-offset-4" onClick={() => onChange([])}>
          Unblock all days
        </Button>
      )}
    </div>
  )
}
