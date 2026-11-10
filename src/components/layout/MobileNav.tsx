import { House, LayoutDashboard, MessageCircle, Plus, Search } from 'lucide-react'
import { NavLink } from 'react-router'
import { cx } from '@/lib/cx'

const ITEMS = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/browse', label: 'Browse', icon: Search },
  { to: '/list', label: 'List', icon: Plus, primary: true },
  { to: '/messages', label: 'Messages', icon: MessageCircle },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

/** Bottom tab bar on phones. Hidden from md up, where the header carries navigation. */
export function MobileNav() {
  return (
    <nav
      aria-label="Quick links"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.map(({ to, label, icon: Icon, end, primary }) => (
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
