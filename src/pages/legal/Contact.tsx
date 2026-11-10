import { LEGAL } from '@shared/legal'
import { BusinessContact, L, LegalPage, type LegalSection } from '@/components/legal/LegalPage'
import { BUSINESS } from '@/config/business'

const sections: LegalSection[] = [
  {
    id: 'business',
    title: 'Business details',
    body: (
      <>
        <BusinessContact />
        {(BUSINESS.registrationNumber || BUSINESS.gstin) && (
          <ul>
            {BUSINESS.registrationNumber && <li>Registration number: {BUSINESS.registrationNumber}</li>}
            {BUSINESS.gstin && <li>GSTIN: {BUSINESS.gstin}</li>}
          </ul>
        )}
        {BUSINESS.branches.length > 0 && (
          <>
            <h3>Branches</h3>
            <ul>
              {BUSINESS.branches.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </>
        )}
      </>
    ),
  },
  {
    id: 'complaints',
    title: 'Making a complaint',
    body: (
      <>
        <p>Write to our grievance officer with:</p>
        <ul>
          <li>Your name and the email on your RentiGoo account</li>
          <li>What happened, and the listing or booking it’s about</li>
          <li>Any photos or messages that help</li>
        </ul>
        <p>We acknowledge every complaint within 24 hours and aim to resolve it within 15 days. We’ll tell you what we did and why.</p>
      </>
    ),
  },
  {
    id: 'elsewhere',
    title: 'If you’re not happy with our answer',
    body: (
      <ul>
        <li>National Consumer Helpline: call 1915.</li>
        <li>For personal data complaints: the Data Protection Board of India.</li>
        <li>
          Read our <L to={LEGAL.terms.path}>Terms</L>, <L to={LEGAL.privacy.path}>Privacy Policy</L> and{' '}
          <L to={LEGAL.refunds.path}>Cancellation and Refund Policy</L>.
        </li>
      </ul>
    ),
  },
]

export default function Contact() {
  return (
    <LegalPage
      title="Contact and complaints"
      version={LEGAL.terms.version}
      intro={<p>Who runs RentiGoo, how to reach us, and how to complain if something goes wrong.</p>}
      sections={sections}
    />
  )
}
