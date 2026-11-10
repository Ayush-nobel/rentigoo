import { LogOut, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useAuth } from '@/context/AuthContext'
import { cx } from '@/lib/cx'
import { Avatar } from '../ui/Avatar'
import { ButtonLink } from '../ui/Button'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

const NAV = [
  { to: '/browse', label: 'Browse' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/trust-and-safety', label: 'Safety' },
]

const navClass = ({ isActive }: { isActive: boolean }) =>
  cx('rounded-full px-4 py-2 font-medium hover:bg-sunken', isActive && 'bg-sunken')

export function Header() {
  const { user } = useAuth()
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={navClass}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ButtonLink to="/list" variant="primary" size="sm" icon={<Plus aria-hidden="true" className="size-4" />} className="max-md:hidden">
            List an item
          </ButtonLink>
          <ThemeToggle />
          {user ? <AccountMenu /> : (
            <ButtonLink to="/login" variant="outline" size="sm">
              Log in
            </ButtonLink>
          )}
        </div>
      </div>
    </header>
  )
}

function AccountMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null
  const item = 'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-sunken'

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="account-menu"
        className="flex items-center rounded-full p-0.5 hover:ring-2 hover:ring-line-strong"
      >
        <Avatar name={user.name} src={user.avatarKey} size="sm" />
        <span className="sr-only">Your account</span>
      </button>
      {open && (
        <div id="account-menu" onClick={(e) => (e.target as HTMLElement).closest('a') && setOpen(false)} className="absolute right-0 mt-2 w-60 rounded-2xl border border-line bg-surface p-2 shadow-card">
          <p className="px-3 pt-1 pb-2 font-semibold">{user.name}</p>
          <Link to="/dashboard" className={item}>Dashboard</Link>
          <Link to="/messages" className={item}>Messages</Link>
          <Link to="/list" className={item}>List an item</Link>
          <button type="button" onClick={() => void signOut()} className={cx(item, 'text-muted')}>
            <LogOut aria-hidden="true" className="size-4" /> Log out
          </button>
        </div>
      )}
    </div>
  )
}
