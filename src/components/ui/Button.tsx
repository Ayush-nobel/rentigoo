import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles'

interface CommonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  className?: string
}

export const Button = forwardRef<HTMLButtonElement, CommonProps & ButtonHTMLAttributes<HTMLButtonElement>>(
  function Button({ variant, size, icon, className, children, type = 'button', ...rest }, ref) {
    return (
      <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...rest}>
        {icon}
        {children}
      </button>
    )
  },
)

export function ButtonLink({ variant, size, icon, className, children, ...rest }: CommonProps & LinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  )
}
