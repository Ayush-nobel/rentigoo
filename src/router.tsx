import { lazyPage } from './lib/lazyPage'
import type { RouteObject } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'

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
const Dashboard = lazyPage(() => import('./pages/Dashboard'))
const Messages = lazyPage(() => import('./pages/Messages'))
const HowItWorks = lazyPage(() => import('./pages/HowItWorks'))
const TrustSafety = lazyPage(() => import('./pages/TrustSafety'))
const About = lazyPage(() => import('./pages/About'))
const NotFound = lazyPage(() => import('./pages/NotFound'))

/**
 * Every route. Used by the browser router (main.tsx) and the build-time
 * prerender (entry-server.tsx).
 */
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'browse', element: <Browse /> },
      { path: 'listing/:id', element: <ListingDetail /> },
      { path: 'list', element: <ProtectedRoute><ListItem /></ProtectedRoute> },
      { path: 'dashboard', element: <ProtectedRoute><Dashboard /></ProtectedRoute> },
      { path: 'messages/:conversationId?', element: <ProtectedRoute><Messages /></ProtectedRoute> },
      { path: 'privacy', element: <Privacy /> },
      { path: 'terms', element: <Terms /> },
      { path: 'refunds', element: <Refunds /> },
      { path: 'cookies', element: <Cookies /> },
      { path: 'contact', element: <Contact /> },
      { path: 'account', element: <ProtectedRoute><Account /></ProtectedRoute> },
      { path: 'how-it-works', element: <HowItWorks /> },
      { path: 'trust-and-safety', element: <TrustSafety /> },
      { path: 'faq', element: <FAQ /> },
      { path: 'about', element: <About /> },
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]
