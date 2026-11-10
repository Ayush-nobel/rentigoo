import { animate, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  format: (n: number) => string
  className?: string
}

/**
 * Counts smoothly to a new value when it changes (never on first render, so
 * prerendered HTML matches). Screen readers get only the final value.
 */
export function AnimatedNumber({ value, format, className }: Props) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(value)
  const from = useRef(value)

  useEffect(() => {
    if (from.current === value) return
    if (reduce) {
      from.current = value
      const t = setTimeout(() => setShown(value), 0)
      return () => clearTimeout(t)
    }
    const controls = animate(from.current, value, {
      duration: 0.35,
      ease: 'easeOut',
      onUpdate: (v) => setShown(v),
      onComplete: () => (from.current = value),
    })
    return () => {
      from.current = value
      controls.stop()
    }
  }, [value, reduce])

  return (
    <span className={className}>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  )
}
