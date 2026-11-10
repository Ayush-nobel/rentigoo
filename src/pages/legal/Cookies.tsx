import { LEGAL } from '@shared/legal'
import { L, LegalPage, type LegalSection } from '@/components/legal/LegalPage'

/*
 * Keep this list in step with the code: every localStorage/sessionStorage key
 * (src/lib/storage.ts uses the "rentigoo-" prefix) and anything a library stores.
 * Verified in a real browser on 2026-11-10 (visitor, signed in, signed out).
 * Demo-mode-only keys (rentigoo-mock-*) never exist on the live site.
 */
const ITEMS: { name: string; where: string; what: string; howLong: string }[] = [
  {
    name: 'CognitoIdentityServiceProvider.…',
    where: 'Local storage',
    what: 'Keeps you logged in: your sign-in tokens, set by Amazon Cognito, our sign-in service.',
    howLong: 'Removed when you log out',
  },
  {
    name: 'com.amplify.Cognito.ap-south-1:….identityId',
    where: 'Local storage',
    what: 'A random visitor ID that lets people who aren’t logged in read public listings securely (Amazon Cognito). It isn’t linked to you.',
    howLong: 'Until you log in or clear your browser’s storage',
  },
  { name: 'rentigoo-theme', where: 'Local storage', what: 'Remembers if you chose light or dark mode.', howLong: 'Until you change it back to “match device”' },
  {
    name: 'react-router-scroll-positions',
    where: 'Session storage',
    what: 'Remembers where you’d scrolled to, so the back button takes you to the same spot.',
    howLong: 'Until you close the tab',
  },
  {
    name: 'rentigoo-signup',
    where: 'Session storage',
    what: 'Holds your name and area for a few minutes while you confirm your email.',
    howLong: 'Until you finish signing up or close the tab',
  },
]

const sections: LegalSection[] = [
  {
    id: 'short',
    title: 'The short version',
    body: (
      <ul>
        <li>RentiGoo doesn’t use cookies.</li>
        <li>We don’t use analytics, advertising or tracking tools of any kind, and no third-party scripts run on our pages.</li>
        <li>Our fonts and images are served from our own site, so your browser doesn’t contact other companies when you visit.</li>
        <li>We use your browser’s storage only for the few things listed below that the site needs in order to work.</li>
      </ul>
    ),
  },
  {
    id: 'list',
    title: 'Everything we store in your browser',
    body: (
      <div className="overflow-x-auto">
        <table>
          <caption className="sr-only">Items stored in your browser</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Where</th>
              <th scope="col">What it’s for</th>
              <th scope="col">How long</th>
            </tr>
          </thead>
          <tbody>
            {ITEMS.map((i) => (
              <tr key={i.name}>
                <td className="font-mono text-[0.9rem] break-all">{i.name}</td>
                <td>{i.where}</td>
                <td>{i.what}</td>
                <td>{i.howLong}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: 'banner',
    title: 'Why there’s no cookie banner',
    body: (
      <p>
        Everything above is strictly necessary for the site to work, or remembers a choice you made. None of it tracks you. A consent banner is for optional
        things like analytics or advertising, and we don’t use any. If we ever add something optional, we’ll ask for your permission first and won’t load it
        unless you say yes.
      </p>
    ),
  },
  {
    id: 'control',
    title: 'Clearing it',
    body: (
      <p>
        You can clear this storage any time in your browser’s settings (look for “site data”). You’ll be logged out, and your theme choice will reset. See the{' '}
        <L to={LEGAL.privacy.path}>Privacy Policy</L> for how we handle your personal data.
      </p>
    ),
  },
]

export default function Cookies() {
  return (
    <LegalPage
      title="Cookie and Storage Policy"
      version={LEGAL.cookies.version}
      intro={<p>What RentiGoo stores in your browser, and why. It’s a short list.</p>}
      sections={sections}
    />
  )
}
