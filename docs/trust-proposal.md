# Trust and verification proposal

*Written 2026-11-18. Proposal only: nothing here is built yet unless it says so.*

## Where we are today

- **Email:** every account confirms its email with a 6-digit code (Cognito). This is the only check that is live.
- **Phone:** a full phone check is **already built but switched off** (commit `d1c8fcc`): text a 6-digit code, keep only a keyed fingerprint of the number (never the number), one number per account, rate limits, and a "Phone number checked" badge. It needs:
  1. the `PHONE_PEPPER` secret set in the sandbox and in the Amplify console;
  2. DLT registration (below), then switching `SMS_MODE` from `off` to `sns`.
- **ID:** nothing. The owner card already has a slot for a "Government ID checked" badge, which shows as not done.

For someone lending an ₹85,000 camera, an email check is not enough. The proposal below adds a phone check for everyone and an optional ID check.

## 1. Phone OTP for all users

### When to ask

Ask at the first moment it matters, not at signup, so joining stays quick:

- before someone **sends their first booking request**, and
- before someone **publishes their first listing**.

Browsing, saving drafts and messaging an owner stay open with email only. Accounts that already exist are asked at their next request or listing.

### Which provider

| Option | Fits our stack | Price per OTP (India) | Notes |
|---|---|---|---|
| **AWS SNS / End User Messaging SMS** (recommended) | Already coded (`SmsSender` with mode `sns`), same AWS account and bill, no new third party in the Privacy Policy | About $0.003 (≈ ₹0.25) on a registered local route; about $0.07 (≈ ₹6) if it falls back to the international route | AWS says its prices change often. Messages to India must use a DLT-registered sender ID and template, or they go international and cost about 20× more |
| **MSG91** (fallback) | Needs a small adapter (one new `SmsSender`) and a Privacy Policy update (new processor) | About ₹0.15–0.25 + 18% GST | Indian company with OTP-specific tooling. Also needs DLT |

**Recommendation:** use SNS, because the code is done and it adds no new company that handles people's data. Check the real per-message cost in the AWS usage report during the first week. If India traffic is billed at the international rate, switch to MSG91: the swap is one small adapter.

### DLT registration (needed for any provider)

Indian telecom rules require every business that sends SMS to register on a DLT portal (Jio, Airtel, Vi or BSNL):

1. Register RentiGoo as a principal entity (needs the business documents; there is a one-time fee that varies by portal).
2. Register a 6-letter sender header, e.g. `RNTIGO`.
3. Register the OTP message template, word for word as the code sends it (`otpMessage` in `shared/phone.ts`).
4. Put the entity ID and template ID into AWS's India sender settings.

Approvals usually take a few working days.

### Cost estimate

Assume 1,000 new accounts a month and about 1.3 texts each (some people ask for a second code):

| | 1,300 texts/month |
|---|---|
| SNS, local route | ≈ $4 (≈ ₹350) |
| SNS, international route | ≈ $90 (≈ ₹7,600) |
| MSG91 | ≈ ₹230–330 + GST |

The built-in limits (one resend a minute, a daily cap per account and per number) stop someone running up the bill by abuse.

## 2. Optional ID check for owners ("ID checked" badge)

### How

Use **DigiLocker** through a licensed provider: the person signs in to DigiLocker and shares their Aadhaar or driving licence, and the provider tells us whether it's valid and the name on it. RentiGoo never sees or stores the document.

| Provider | Price (from their sites, 2026; confirm before signing) |
|---|---|
| Setu DigiLocker | ₹4 per successful check (up to 1,000 a month) |
| eKYCNow (Message Central) | ₹2.49–₹10 per check (their pages disagree) |
| IDfy, Digio | Prices on request |

At, say, 200 owners a month, that's about ₹500–2,000 a month.

### What we keep

- Only: "ID checked: yes", the date, and whether the name matched the profile's name.
- Never the Aadhaar number, a copy of the document, the address or the photo. The Aadhaar Act strictly limits who may store Aadhaar numbers, and we don't need them.

### Before building

- Add the provider to the Privacy Policy as a processor, and describe exactly what's kept. Bump the version in `shared/legal.ts`.
- Ask for consent on the screen itself, with the check unticked by default.
- Keep it optional for owners, so nobody is required to share an ID document to use RentiGoo.

## 3. Where badges show

| Place | What shows |
|---|---|
| **Listing page, owner card** (`OwnerCard.tsx`, slots already exist) | Email checked · Phone number checked · ID checked |
| **Owner's request list** (Dashboard → Requests) | The renter's badges, next to their name, so the owner can decide |
| **Message thread header** | The other person's badges |
| **Listing cards** (Browse, Home) | One small "ID checked" mark on the photo when the owner has it; nothing otherwise (no "not verified" labels) |
| **Account page** | Your own checks, with buttons to add the missing ones |

**Optional owner setting:** "Only accept requests from renters with a checked phone number". Once phone checks are required for everyone this setting is unnecessary; it is useful if phone checks stay optional.

## Copy rules for badges

Say exactly what was checked, nothing more: "Phone number checked", never "Verified user" or "Trusted". The Trust and Safety page and the Home trust list must be updated in the same change that switches each check on.

## Decisions needed

1. Phone check: required before the first request and first listing (recommended), or optional?
2. Who registers on DLT, and which operator's portal?
3. ID check: build it now, or after phone checks are live?

## Sources

- AWS SMS pricing and India rates: [AWS re:Post thread](https://repost.aws/questions/QU68x63rPLQjiEGlQv1h_IFg/sms-charges-via-sns-20x-high-then-actual), [AWS SMS pricing](https://aws.amazon.com/pt/sns/sms-pricing/)
- MSG91 OTP prices: [MSG91 OTP price update](https://msg91.com/guide/sms-otp-price-update-2024-best-price-guaranteed!), [Message Central OTP pricing comparison](https://www.messagecentral.com/en-in/blog/sms-otp-pricing-india), [productgrowth.in](https://productgrowth.in/numbers/sms-otp-cost-india/)
- DigiLocker prices: [Setu DigiLocker](https://setu.co/data/kyc/digilocker/), [eKYCNow pricing](https://www.messagecentral.com/en-in/product/ekyc-now/pricing/india)
