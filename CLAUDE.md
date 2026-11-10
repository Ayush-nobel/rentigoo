# RentiGoo
Peer-to-peer rental marketplace for India. Launch market: Bhopal, Madhya Pradesh. Deployed to AWS Amplify.

## Brand (from the logo, do not substitute)
Accent golden yellow #F2D04E, ink #24221B, cream #FAF7F0, white text on dark. Logo files go in /public/brand.

## Stack
Vite + React + TypeScript, Tailwind, Framer Motion, React Router. Backend: AWS Amplify Gen 2 in /amplify (Cognito auth, AppSync + DynamoDB data, S3 photos, Lambda for bookings/reviews). Pricing and calculator logic lives in /shared and is used by both the browser and the Lambdas. Seed/mock data in /src/data; `VITE_DATA_MODE=mock|amplify` picks the data source. Full plan: ~/.claude/plans/plan-a-complete-rentigoo-imperative-cloud.md.

## Rules
Human, warm copy (no corporate filler). Mobile-first. Accessible contrast and keyboard focus. Light and dark themes. Rupee pricing. Plan before coding, build one page at a time, run the build and fix errors before saying done.

## Legal and trust rules (keep these true)
- No claim on the site we can't prove today (reply times, popularity, verification we don't do, guarantees on behalf of owners). Estimates must say "estimate".
- Never show made-up people, listings or reviews as real. Demo/seed data only with the "Test version" banner (VITE_DEMO_DATA / mock mode); production builds refuse it (`npm run check:launch`, run by amplify.yml on `main`).
- Collect only what a feature needs; full names, emails and consent records stay private (public name is "First L."). Any new data, storage key, third party or retention change must be reflected in the Privacy / Cookie pages (src/pages/legal) in the same change, and the version bumped in shared/legal.ts.
- No analytics, ads or third-party scripts/fonts. If ever added: ask for consent first and load nothing until the person says yes.
- Every form control uses the shared components (ui/Field, ui/Checkbox); consent boxes are never pre-ticked.
- Business details live only in src/config/business.ts; never invent them.
- Accessibility: text ≥4.5:1, control outlines ≥3:1, visible focus on every tab stop, alt text on every image.
