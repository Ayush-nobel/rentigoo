import { DayPicker, type DateRange } from 'react-day-picker'
import { enIN } from 'react-day-picker/locale'
import type { ISODate } from '@shared/types'
import { isoToLocalDate, localDateToISO } from '@/lib/dates'

export interface IsoRange {
  from?: ISODate
  to?: ISODate
}

interface Props {
  blockedDates: ISODate[]
  today: ISODate
  value: IsoRange
  onChange: (r: IsoRange) => void
}

/** Pick pickup and return dates. Past and booked days can't be picked. */
export function AvailabilityCalendar({ blockedDates, today, value, onChange }: Props) {
  const todayDate = isoToLocalDate(today)
  const selected: DateRange | undefined = value.from
    ? { from: isoToLocalDate(value.from), to: value.to ? isoToLocalDate(value.to) : undefined }
    : undefined

  return (
    <div>
      <DayPicker
        mode="range"
        locale={enIN}
        selected={selected}
        onSelect={(r) => {
          const from = r?.from ? localDateToISO(r.from) : undefined
          const to = r?.to ? localDateToISO(r.to) : undefined
          // The first tap sets start and end to the same day; treat that as
          // "pickup chosen" so the next tap picks the return date.
          onChange({ from, to: to && to !== from ? to : undefined })
        }}
        disabled={[{ before: todayDate }, ...blockedDates.map(isoToLocalDate)]}
        excludeDisabled
        startMonth={todayDate}
        endMonth={new Date(todayDate.getFullYear() + 1, todayDate.getMonth())}
        weekStartsOn={1}
      />
      <p className="mt-2 flex items-center gap-2 text-[0.9375rem] text-muted">
        <span aria-hidden="true" className="line-through decoration-[1.5px]">
          12
        </span>
        Struck-through days are already booked or in the past.
      </p>
    </div>
  )
}

/** Pick one start date (monthly rentals). Past and booked days can't be picked. */
export function StartDateCalendar({ blockedDates, today, value, onChange }: { blockedDates: ISODate[]; today: ISODate; value?: ISODate; onChange: (d?: ISODate) => void }) {
  const todayDate = isoToLocalDate(today)
  return (
    <div>
      <DayPicker
        mode="single"
        locale={enIN}
        selected={value ? isoToLocalDate(value) : undefined}
        onSelect={(d) => onChange(d ? localDateToISO(d) : undefined)}
        disabled={[{ before: todayDate }, ...blockedDates.map(isoToLocalDate)]}
        startMonth={todayDate}
        endMonth={new Date(todayDate.getFullYear() + 1, todayDate.getMonth())}
        weekStartsOn={1}
      />
      <p className="mt-2 flex items-center gap-2 text-[0.9375rem] text-muted">
        <span aria-hidden="true" className="line-through decoration-[1.5px]">
          12
        </span>
        Struck-through days are already booked or in the past.
      </p>
    </div>
  )
}
