import { House, LayoutDashboard, LogIn, MessageCircle, Plus, Search } from 'lucide-react'
import { NavLink } from 'react-router'
import { useAuth } from '@/context/AuthContext'
import { cx } from '@/lib/cx'

const COMMON = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/browse', label: 'Browse', icon: Search },
  { to: '/list', label: 'List', icon: Plus, primary: true },
]
// Messages and Dashboard mean nothing to a new visitor, so they only appear once you're signed in.
const SIGNED_IN = [...COMMON, { to: '/messages', label: 'Messages', icon: MessageCircle }, { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }]
const SIGNED_OUT = [...COMMON, { to: '/login', label: 'Log in', icon: LogIn }]

/** Bottom tab bar on phones. Hidden from md up, where the header carries navigation. */
export function MobileNav() {
  const { user } = useAuth()
  const items = user ? SIGNED_IN : SIGNED_OUT
  return (
    <nav
      aria-label="Quick links"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className={cx('mx-auto grid max-w-lg', items.length === 5 ? 'grid-cols-5' : 'grid-cols-4')}>
        {items.map(({ to, label, icon: Icon, end, primary }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cx('flex min-h-15 flex-col items-center justify-center gap-0.5 text-[0.8125rem] font-medium', isActive ? 'text-text' : 'text-muted')
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cx(
                      'grid place-items-center rounded-full transition-colors',
                      primary ? 'size-9 bg-accent text-on-accent' : cx('h-7 w-12', isActive && 'bg-sunken'),
                    )}
                  >
                    <Icon aria-hidden="true" className="size-5" strokeWidth={isActive || primary ? 2.25 : 1.75} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
