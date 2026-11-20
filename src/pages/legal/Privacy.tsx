import { LAUNCH_CITY } from '@shared/areas'
import { POLICY } from '@shared/policy'
import { rupees } from '@/lib/format'
import { ID_CHECK_LIVE } from '@/lib/features'
import { LEGAL, MIN_AGE } from '@shared/legal'
import { BusinessContact, L, LegalPage, type LegalSection } from '@/components/legal/LegalPage'
import { BUSINESS, shown } from '@/config/business'

/*
 * Written to match what the code actually does. If you change what we collect,
 * who we share with or how long we keep things, change this page and bump
 * LEGAL.privacy.version in shared/legal.ts.
 */
const sections: LegalSection[] = [
  {
    id: 'who',
    title: 'Who we are',
    body: (
      <>
        <p>
          RentiGoo is an online marketplace where people in {LAUNCH_CITY} rent things to and from each other. It is run by{' '}
          {shown(BUSINESS.legalName, 'Legal name')}. For data protection law, we are the “Data Fiduciary” for the personal data described here.
        </p>
        <p>Questions about your data, or a complaint, go to our grievance officer:</p>
        <BusinessContact />
      </>
    ),
  },
  {
    id: 'collect',
    title: 'What we collect and why',
    body: (
      <>
        <p>We only collect what we need to run the marketplace. Here is all of it.</p>
        <div className="overflow-x-auto">
          <table>
            <caption className="sr-only">Personal data we collect</caption>
            <thead>
              <tr>
                <th scope="col">What</th>
                <th scope="col">Why we need it</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Your email address</td>
                <td>To create your login, send you sign-in and reset codes, and reach you about your bookings. Never shown to other people.</td>
              </tr>
              <tr>
                <td>Your password</td>
                <td>To protect your account. It is handled by Amazon Cognito; we never see or store it ourselves.</td>
              </tr>
              <tr>
                <td>Your name</td>
                <td>So people know who they’re dealing with. Others see only your first name and last initial (for example “Meera J.”).</td>
              </tr>
              <tr>
                <td>Your area in {LAUNCH_CITY}</td>
                <td>To show you things nearby and tell renters roughly where an item is. We don’t collect your street address or location.</td>
              </tr>
              <tr>
                <td>Bio and languages (optional)</td>
                <td>Only if you choose to add them, to help others get to know you.</td>
              </tr>
              <tr>
                <td>Your listings</td>
                <td>
                  To show your items to renters: title, description, photos, prices, deposit, what the item cost new (which sets the deposit limit) and
                  the days they’re free. Listing photos are public files, like the listing itself. Before a photo is uploaded, your browser resizes it and
                  removes its hidden details, such as the GPS location phones save in pictures.
                </td>
              </tr>
              <tr>
                <td>Original bill (owners, items over {rupees(POLICY.receiptAbove)})</td>
                <td>
                  A photo or PDF of the bill or receipt, so we can value the item fairly if a renter and owner disagree about damage. It may show your name,
                  address or how you paid. It’s a private file: renters and other visitors can never see it, and only RentiGoo staff can open it. Photos are
                  resized in your browser first, which also removes location details; PDFs are kept as you upload them.
                </td>
              </tr>
              <tr>
                <td>Bookings</td>
                <td>To run rentals: who, what, dates, the price breakdown, status, and the optional note you send with a request. For monthly rentals, also which months the owner has marked as paid, and any notice given.</td>
              </tr>
              {ID_CHECK_LIVE && (
                <tr>
                  <td>ID check (optional)</td>
                  <td>
                    Only if you choose to check your ID through DigiLocker. Our provider, Setu, passes us the name, date of birth and last 4 digits of your Aadhaar once;
                    we check the name matches your profile and keep only that your ID was checked, when, and a coded fingerprint so one ID can’t check many accounts.
                    We never keep your Aadhaar number, date of birth, address or photo, and we end our access to your DigiLocker straight away.
                  </td>
                </tr>
              )}
              <tr>
                <td>Pickup and return checks (optional)</td>
                <td>
                  If you record one: a short checklist, your notes and up to 6 photos of the item, to settle any disagreement about damage. Only the two people in
                  the booking can see them (and we can, if one of you asks us to look at a dispute). The photos are private files, never public links.
                </td>
              </tr>
              <tr>
                <td>Phone check (optional)</td>
                <td>
                  Only if you choose to check your mobile number, once phone checks are switched on. We text a one-time code to it through Amazon Web Services and the
                  mobile networks. We then keep only a fingerprint of the number (a keyed code that can’t be turned back into the number), so one number can’t check
                  several accounts. The number itself isn’t stored, and it’s never shown to anyone.
                </td>
              </tr>
              <tr>
                <td>Messages</td>
                <td>So renters and owners can arrange pickups. Only the two people in a conversation can read it, and messages can’t be edited once sent. The other person can see when you’ve read their latest message.</td>
              </tr>
              <tr>
                <td>Reviews</td>
                <td>So people can judge who to rent with. Only someone who completed a rental can review it.</td>
              </tr>
              <tr>
                <td>Your agreement</td>
                <td>The versions of our Terms and this policy you agreed to, and when. Kept as proof of your consent.</td>
              </tr>
              <tr>
                <td>Technical logs</td>
                <td>When something goes wrong on our servers, error details are logged so we can fix it. These logs are deleted after one month.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <h3>What we don’t collect</h3>
        <ul>
          <li>Your phone number (a phone check uses it once and keeps only a fingerprint), ID documents, bank or card details (payments happen directly between renter and owner at pickup today).</li>
          <li>Your precise location, contacts, or anything from other apps.</li>
          <li>Analytics, advertising IDs or tracking of what you do across the internet. We use no analytics or advertising tools.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'consent',
    title: 'Your consent',
    body: (
      <>
        <p>
          When you create an account, you tick a box to agree to us using your data as this policy explains. You can withdraw that consent at any time by
          deleting your account (see section 8). Withdrawing doesn’t affect what was done lawfully before.
        </p>
        <p>
          We may also use personal data without asking where the law allows, for example to comply with a court order or a lawful request from a government
          authority, or to respond to a medical emergency.
        </p>
      </>
    ),
  },
  {
    id: 'see',
    title: 'Who can see your data',
    body: (
      <>
        <ul>
          <li>
            <strong>Anyone visiting RentiGoo</strong> can see your public name, area, profile bio and languages, your listings, your rating, and reviews about you.
            They can’t see the bills you upload for your listings.
          </li>
          <li>
            <strong>The other person in a booking</strong> can see the booking details and the messages between you.
          </li>
          <li>
            <strong>Our service providers</strong> store and process data for us under contract, and only to run RentiGoo. Today that is Amazon Web Services
            (sign-in, database, file storage, servers, and the emails that carry your codes).
          </li>
          {ID_CHECK_LIVE && (
            <li>
              <strong>Setu</strong> (DigiLocker access), only if you check your ID, to fetch your Aadhaar details once on our behalf.
            </li>
          )}
          <li>
            <strong>WhatsApp</strong>, only if you choose to message us there. WhatsApp (owned by Meta) handles that chat under its own privacy policy. We use your
            number and messages only to help you.
          </li>
          <li>
            <strong>Authorities</strong>, when the law requires us to share, for example under a court order.
          </li>
        </ul>
        <p>We don’t sell your data, and we don’t share it with advertisers.</p>
      </>
    ),
  },
  {
    id: 'where',
    title: 'Where your data is kept',
    body: (
      <p>
        Your data is stored with Amazon Web Services in their Mumbai region, in India. It is encrypted when it travels between your browser and our servers,
        and encrypted when stored.
      </p>
    ),
  },
  {
    id: 'how-long',
    title: 'How long we keep it',
    body: (
      <ul>
        <li>Your account, profile, listings, messages and reviews: until you delete your account.</li>
        <li>Listing photos: until you take them off the listing, delete the listing, or delete your account.</li>
        <li>
          Original bills: until you replace the bill, delete the listing, or delete your account. A bill uploaded but never saved with a listing is deleted
          automatically after a day.
        </li>
        <li>Pickup and return checks and their photos: deleted automatically 30 days after the rental ends, or sooner if you delete your account.</li>
        <li>Phone check: the fingerprint until you remove the check or delete your account; a count of codes sent to a number, for two days.</li>
        <li>
          A minimal record of past bookings (dates, item, amounts and an internal ID, with no name or messages): for as long as tax, accounting and consumer
          protection laws require us to keep transaction records, then deleted.
        </li>
        <li>Server error logs: one month.</li>
        <li>Your sign-in on this device: until you log out (it’s kept in your browser’s storage).</li>
      </ul>
    ),
  },
  {
    id: 'security',
    title: 'How we protect it',
    body: (
      <>
        <ul>
          <li>Passwords are handled by Amazon Cognito and never stored by us. Codes confirm that your email is really yours.</li>
          <li>Access rules on our servers decide who can read or change each piece of data. For example, only the two people in a booking can see it.</li>
          <li>Prices, availability and reviews are checked on our servers, not trusted from the browser.</li>
        </ul>
        <p>
          If a personal data breach happens, we will tell the people affected and the Data Protection Board of India, as the law requires.
        </p>
      </>
    ),
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: (
      <>
        <p>Under India’s Digital Personal Data Protection Act, 2023, you can:</p>
        <ul>
          <li>
            <strong>Get a copy of your data.</strong> Go to <L to="/account">Account</L> and choose “Download my data”.
          </li>
          <li>
            <strong>Correct it.</strong> Ask us, or change it yourself where the app lets you.
          </li>
          <li>
            <strong>Delete it.</strong> Go to <L to="/account">Account</L> and choose “Delete my account”. It happens straight away, except for the minimal
            booking records the law makes us keep.
          </li>
          <li>
            <strong>Complain to us</strong>, through our grievance officer (section 1). We acknowledge complaints within 24 hours and aim to resolve them within
            15 days.
          </li>
          <li>
            <strong>Complain to the Data Protection Board of India</strong> if you’re not happy with our answer.
          </li>
          <li>
            <strong>Nominate someone</strong> to exercise these rights for you if you die or become unable to. Write to our grievance officer to do this.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'age',
    title: 'Age limit',
    body: (
      <p>
        RentiGoo is for people aged {MIN_AGE} and over. We don’t knowingly collect data from anyone younger. If you think a child has an account, tell our
        grievance officer and we’ll delete it.
      </p>
    ),
  },
  {
    id: 'storage',
    title: 'Cookies and browser storage',
    body: (
      <p>
        We don’t use cookies. We use your browser’s storage only for things the site needs to work, like keeping you logged in. The{' '}
        <L to={LEGAL.cookies.path}>Cookie and Storage Policy</L> lists each item.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        If we change this policy in a way that matters, we’ll update the date at the top and show a notice on your Account page. If a change needs your
        consent, we’ll ask for it before the change applies to you.
      </p>
    ),
  },
]

export default function Privacy() {
  return (
    <LegalPage
      path="/privacy"
      title="Privacy Policy"
      version={LEGAL.privacy.version}
      intro={
        <p>
          This explains what personal data RentiGoo collects, why, who can see it, how long we keep it, and how you can download or delete it. We’ve kept it in
          plain language. If anything is unclear, ask our grievance officer.
        </p>
      }
      sections={sections}
    />
  )
}
