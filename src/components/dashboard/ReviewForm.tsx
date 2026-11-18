import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { TextAreaField } from '@/components/ui/Field'
import { StarInput } from '@/components/ui/StarInput'
import { api, ApiError } from '@/lib'

interface Props {
  bookingId: string
  /** Who's being reviewed, e.g. "Vikram S." */
  aboutName: string
  asRenter: boolean
  onDone: () => void
  onCancel: () => void
}

/** A review of a finished rental. Reviews can't be edited, so the button says so. */
export function ReviewForm({ bookingId, aboutName, asRenter, onDone, onCancel }: Props) {
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [errors, setErrors] = useState<{ rating?: string; text?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!rating) next.rating = 'Choose from 1 to 5 stars.'
    if (text.trim().length < 10) next.text = 'Write a few words about how it went (at least 10 characters).'
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await api.submitReview(bookingId, rating, text)
      onDone()
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Your review wasn’t saved. Please try again.' })
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={submit} className="mt-4 space-y-4 card rounded-[20px] p-4 sm:p-5">
      <StarInput legend={asRenter ? `How was renting from ${aboutName}?` : `How was ${aboutName} as a renter?`} value={rating} onChange={setRating} error={errors.rating} />
      <TextAreaField
        label="Your review"
        hint={asRenter ? 'What was the item like, and how did pickup and return go?' : 'Was it returned on time and in the same condition?'}
        value={text}
        maxLength={1000}
        rows={4}
        error={errors.text}
        onChange={(e) => setText(e.target.value)}
      />
      <p className="text-[0.9375rem] text-muted">Reviews are public and can’t be changed later. Keep it honest and about this rental.</p>
      {errors.form && (
        <p role="alert" className="font-medium text-danger">
          {errors.form}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? 'Posting…' : 'Post review'}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Not now
        </Button>
      </div>
    </form>
  )
}
