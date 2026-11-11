import { lazyPage } from './lib/lazyPage'
import type { RouteObject } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { ComingSoon } from './pages/ComingSoon'

const Home = lazyPage(() => import('./pages/Home'))
const Browse = lazyPage(() => import('./pages/Browse'))
const ListingDetail = lazyPage(() => import('./pages/ListingDetail'))
const Login = lazyPage(() => import('./pages/Login'))
const Account = lazyPage(() => import('./pages/Account'))
const FAQ = lazyPage(() => import('./pages/FAQ'))
const Privacy = lazyPage(() => import('./pages/legal/Privacy'))
const Terms = lazyPage(() => import('./pages/legal/Terms'))
const Refunds = lazyPage(() => import('./pages/legal/Refunds'))
const Cookies = lazyPage(() => import('./pages/legal/Cookies'))
const Contact = lazyPage(() => import('./pages/legal/Contact'))
const Signup = lazyPage(() => import('./pages/Signup'))
const ListItem = lazyPage(() => import('./pages/ListItem'))
const NotFound = lazyPage(() => import('./pages/NotFound'))

/**
 * Every route. Used by the browser router (main.tsx) and the build-time
 * prerender (entry-server.tsx). Pages still marked ComingSoon are noindexed
 * and swapped for real pages as each build step lands.
 */
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'browse', element: <Browse /> },
      { path: 'listing/:id', element: <ListingDetail /> },
      { path: 'list', element: <ProtectedRoute><ListItem /></ProtectedRoute> },
      { path: 'dashboard', element: <ProtectedRoute><ComingSoon title="Dashboard" /></ProtectedRoute> },
      { path: 'messages/:conversationId?', element: <ProtectedRoute><ComingSoon title="Messages" /></ProtectedRoute> },
      { path: 'privacy', element: <Privacy /> },
      { path: 'terms', element: <Terms /> },
      { path: 'refunds', element: <Refunds /> },
      { path: 'cookies', element: <Cookies /> },
      { path: 'contact', element: <Contact /> },
      { path: 'account', element: <ProtectedRoute><Account /></ProtectedRoute> },
      { path: 'how-it-works', element: <ComingSoon title="How it works" /> },
      { path: 'trust-and-safety', element: <ComingSoon title="Trust and safety" /> },
      { path: 'faq', element: <FAQ /> },
      { path: 'about', element: <ComingSoon title="About RentiGoo" /> },
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]
