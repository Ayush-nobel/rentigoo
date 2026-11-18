# Switching things on

What's built and waiting, and the steps only you can do.

## ID checks (DigiLocker through Setu)

Built and tested in the sandbox (test mode). Off in production until the keys are set.

1. Sign up at https://setu.co → Data → DigiLocker. You'll need the business details from `src/config/business.ts`.
2. In Setu's bridge, create a DigiLocker product instance. Note the **client ID**, **client secret** and **product instance ID**.
   - Add `https://www.rentigoo.in/account/id-check` as an allowed redirect.
3. In the Amplify console → the app → **Hosting → Environment variables** (main branch), add:
   - `SETU_CLIENT_ID`
   - `SETU_PRODUCT_INSTANCE_ID`
   - Optionally `SETU_BASE_URL=https://dg-sandbox.setu.co` to try Setu's sandbox first. Leave it unset for production.
4. In **Hosting → Secrets**, add `SETU_CLIENT_SECRET`.
5. **Before redeploying:** bump `privacy.version` in `shared/legal.ts`. The Privacy Policy gains its ID-check row and Setu as a processor once these are set.
6. Redeploy main. The Account page shows "ID check", the trust pages describe it, and owners can earn the "ID checked (DigiLocker)" badge.

Cost: about ₹4 per successful check on Setu's starter plan (confirm with them).

## Phone checks

Built, off until DLT registration. See `docs/trust-proposal.md` (DLT steps). Then set `DLT_ENTITY_ID`, `DLT_TEMPLATE_ID` and `SMS_SENDER_ID` as environment variables on main and redeploy.

## Google Business Profile and search

The site now has a page per category ("Camera on rent in Bhopal" at `/rent/cameras`, and so on). They're in the sitemap, and every page carries the business name, phone and address for search engines.

What only you can do:

1. **Google Search Console** (https://search.google.com/search-console):
   - Add `https://www.rentigoo.in`.
   - Verify it with the DNS TXT record Google gives you. Add it at your DNS host, alongside the Zoho records, and change nothing else.
   - Submit `https://www.rentigoo.in/sitemap.xml`.
2. **Google Business Profile** (https://business.google.com):
   - **Name:** "RentiGoo". Use the same spelling as the site.
   - **Category:** "Rental shop" or "Equipment rental agency"; pick what describes you best.
   - **Address:** a home address can be hidden. Choose "I deliver goods and services to my customers" and set the service area to Bhopal.
   - **Phone:** +91 93014 22919. **Website:** https://www.rentigoo.in.
   - **Verification:** Google verifies by postcard, phone or video. Follow its prompt.
   - **Photos:** add real ones, such as items for rent and the founders. Not stock photos.
3. Ask your first real renters and owners to leave a Google review, which counts for local search.
