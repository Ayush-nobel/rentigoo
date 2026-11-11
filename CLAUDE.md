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
- People never write listings, bookings, reviews, conversations or messages directly: each goes through a Lambda (saveListing/deleteMyListing, booking functions, messages) that sets the owner/sender itself and checks shared rules (e.g. shared/listingRules). Keep model auth read-only for people; prove it in scripts/check-access.ts.
- Listing photos: resized to WebP in the browser (strips GPS), public read only under listing-photos/, deleted when removed from a listing or on account deletion.

## Search and rendering (keep these working)
- `npm run build` = SPA build + SSR build (src/entry-server.tsx) + scripts/prerender.mjs, which writes HTML for public pages and every active listing, plus robots.txt, sitemap.xml and amplify-rewrites.json. Set VITE_SITE_URL (https, no path) in Amplify; check:launch requires it.
- Prerendered pages are flat files (/privacy -> privacy.html) so Amplify serves them with no trailing-slash redirect. Amplify needs one custom rule: `/<*>` -> `/app.html` (404-200), as in amplify-rewrites.json. Test locally with `npm run preview:static`; `vite preview` does NOT serve the prerendered files.
- Every page sets its metadata with <Seo/> from src/lib/seo.ts (STATIC_PAGES) or listingMeta; private, unfinished and error pages are noindex. New public pages: add to STATIC_PAGES.
- Pages must render the same on the server and on first client render: no Date.now()/localStorage/window in render (use useHydrated or suppressHydrationWarning for "time ago"). Lazy pages use lazyPage() so they can be preloaded before hydration.
- Never add robots rules by prefix that could catch /listing (e.g. use "/list$").
- `git push` may need the GitHub CLI login: `git -c credential.helper= -c 'credential.https://github.com.helper=!gh auth git-credential' push`.
- Amplify builds with Node 22 / npm 10; this Mac has npm 11, which writes lock files npm 10 rejects. After any dependency change, run `npx npm@10 install --package-lock-only` and check `npx npm@10 ci --dry-run` passes before pushing.
