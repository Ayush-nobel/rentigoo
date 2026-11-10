import { lazy } from 'react'
import { createBrowserRouter } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { ComingSoon } from './pages/ComingSoon'

const Home = lazy(() => import('./pages/Home'))
const Browse = lazy(() => import('./pages/Browse'))
const ListingDetail = lazy(() => import('./pages/ListingDetail'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const NotFound = lazy(() => import('./pages/NotFound'))

/**
 * Every route in the plan. Pages still marked ComingSoon are swapped for
 * lazy-loaded real pages as each build step lands.
 */
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'browse', element: <Browse /> },
      { path: 'listing/:id', element: <ListingDetail /> },
      { path: 'list', element: <ProtectedRoute><ComingSoon title="List an item" /></ProtectedRoute> },
      { path: 'dashboard', element: <ProtectedRoute><ComingSoon title="Dashboard" /></ProtectedRoute> },
      { path: 'messages/:conversationId?', element: <ProtectedRoute><ComingSoon title="Messages" /></ProtectedRoute> },
      { path: 'how-it-works', element: <ComingSoon title="How it works" /> },
      { path: 'trust-and-safety', element: <ComingSoon title="Trust and safety" /> },
      { path: 'faq', element: <ComingSoon title="Questions and answers" /> },
      { path: 'about', element: <ComingSoon title="About RentiGoo" /> },
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
