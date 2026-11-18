# Security review

*Read-only review, 2026-11-18. Nothing was changed. It covers the code on `main` at commit `ed9eb7a` and the live site's response headers. It is a code read, not a penetration test: findings marked "confirmed" were traced through the code; nothing was exploited against the live system.*

## Summary

| # | Severity | Finding |
|---|---|---|
| 1 | **High** | Any signed-in user can get the server to delete another owner's listing photos |
| 2 | Medium | No security headers on the site (no CSP, HSTS, clickjacking protection) |
| 3 | Medium | Uploads aren't checked on the server: any file type or size, publicly readable |
| 4 | Medium | No rate limits on messages, booking requests or listing saves |
| 5 | Low–Medium | A listing owner can open a chat with any user, unprompted |
| 6 | Low | Profiles can be edited (and deleted) directly, skipping server checks |
| 7 | Low | Login tokens are kept in localStorage |
| 8 | Low | Signup reveals whether an email already has an account |
| 9 | Low | No MFA option and no Cognito threat protection |
| 10 | Info | Secrets: none found in the repo or the browser bundle |
| 11 | Info | CORS: no problem found; S3 CORS not checked |

The core authorization design is sound. Listings, bookings, reviews and messages can only be written through Lambdas that set the owner or sender themselves. Prices are recomputed on the server. Bookings, conversations and messages are readable only by the people in them. See "What's already right" at the end.

---

## 1. High: deleting other people's photos (confirmed)

**Where**
- `shared/listingRules.ts:64` and `:89`: a photo key is accepted if it matches `listing-photos/<any identity>/<uuid>.webp`. Nothing checks that the folder belongs to the person saving the listing.
- `amplify/functions/logic/listings.ts:60–65`: when a photo is taken off a listing, `saveListing` deletes it from S3.
- `amplify/functions/logic/account.ts:72–75`: `deleteMyAccount` deletes **the whole folder** of every photo on the person's listings.

**Risk**
Photo keys are public: they're in every listing page's HTML. The attack:
1. An attacker copies a victim's photo key into their own listing.
2. They save the listing again without that photo, and the Lambda deletes the victim's photo.
3. Or they delete their account, and the Lambda deletes the victim's entire photo folder, i.e. all their listing photos.

The Lambdas run with `s3:DeleteObject` on all of `listing-photos/*` (`amplify/backend.ts:62–66`), so S3 doesn't stop it. Separately, anyone can show someone else's photos on their own listing.

**Why it happens**
Uploads go to `listing-photos/<Cognito identity ID>/`, but the Lambdas only know the user-pool `sub`. Nothing links the two.

**Suggested fix**
Tie folders to the user, and check it on the server:
- **Best:** issue uploads from a small Lambda that returns a presigned URL for `listing-photos/<sub>/<uuid>.webp`, where `<sub>` is the caller's own user ID. Then `saveListing` accepts only keys starting with `listing-photos/<actorId>/`, and `deleteMyAccount` deletes only `listing-photos/<actorId>/`. This also fixes most of finding 3.
- **Smaller stopgap:** in `saveListing` and `deleteMyAccount`, refuse to delete any key whose folder isn't recorded as the caller's. Store `identityId → sub` the first time a user saves a listing, after checking it with an IAM-authorized call that carries both IDs.

Add a test: user B saves a listing with user A's key, then removes it, and A's photo is still there.

## 2. Medium: no security headers (confirmed on the live site)

**Where**
- `amplify.yml` has no `customHeaders`.
- `curl -I https://www.rentigoo.in/` returns only `cache-control` and `server: AmazonS3`.

**Risk**
- **No CSP:** a single XSS bug would let a script read login tokens (see finding 7).
- **No `frame-ancestors` / `X-Frame-Options`:** clickjacking is possible.
- **No `Strict-Transport-Security`:** the first visit can be downgraded to HTTP.
- **No `X-Content-Type-Options: nosniff` and no `Referrer-Policy`.**

**Suggested fix**
Add custom headers in Amplify Hosting, either in `amplify.yml` under `customHeaders` or in the console:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- A CSP that allows only:
  - the site itself;
  - the AppSync, Cognito and S3 endpoints in `amplify_outputs.json` (`connect-src`, `img-src`);
  - `'self'` for scripts and fonts, since everything is self-hosted;
  - `frame-ancestors 'none'`.

Try the CSP as `Content-Security-Policy-Report-Only` for a few days before enforcing it.

## 3. Medium: uploads aren't checked on the server

**Where**
- `amplify/storage/resource.ts`: any signed-in user can write anything to their own `listing-photos/<id>/` folder.
- `amplify/backend.ts:54`: everything under `listing-photos/*` is publicly readable.
- Resizing to WebP happens only in the browser (`src/lib/photos.ts`).

**Risk**
Someone can bypass the app and upload files of any size or type (HTML, executables, huge videos) to our bucket, under a public URL. That turns our bucket into free hosting for phishing pages or malware, and costs us storage and bandwidth. Uploads never attached to a listing stay forever.

**Suggested fix**
- Use presigned POST uploads from a Lambda (the same change as fix 1), with conditions on `content-length-range` (e.g. ≤ 2 MB) and `Content-Type` (`image/webp` or `image/jpeg`).
- Or add an S3 event Lambda that deletes anything that isn't a small image.
- Add a lifecycle rule, or a nightly job, that removes uploads not used by any listing after 1–2 days.

## 4. Medium: no rate limits on messages, requests and saves

**Where**
- `sendMessage`, `startConversation`, `requestBooking` and `saveListing` (`amplify/data/resource.ts`, custom mutations).
- Only the phone check has limits (`amplify/functions/logic/phone.ts`).
- There is no AWS WAF on AppSync.

**Risk**
- One account can send thousands of messages or booking requests to owners.
- Repeatedly saving an active listing keeps triggering Amplify rebuilds. They're capped at one queued build, but it's still build minutes.
- Sign-up and login are throttled by Cognito, but nothing stops a script making many accounts, apart from email confirmation.

**Suggested fix**
- Put AWS WAF on the AppSync API with a rate-based rule per IP, e.g. 300 requests per 5 minutes.
- Add per-user counters in the Lambdas, the way the phone check does. For example: 30 messages a minute, 20 new booking requests a day, 10 new conversations a day.

## 5. Low–Medium: owners can message anyone

**Where:** `amplify/functions/logic/messages.ts:48`. A conversation is allowed if *either* side owns the listing. That lets an owner start a conversation with any user ID, and user IDs are visible on public reviews.

**Risk:** unsolicited messages and spam from anyone who creates a listing.

**Suggested fix:** let owners start a conversation only with someone who has requested or booked that listing. Renters keep starting chats with owners as now.

## 6. Low: profiles can be edited directly

**Where:** `amplify/data/resource.ts:109`. The profile owner has `update` and `delete` on `UserProfile` straight through AppSync. That covers `name`, `areaId`, `bio`, `languages` and `avatarKey`.

**Risk**
- These edits skip the checks `createMyProfile` makes: name length, a real area ID.
- `bio` has no length limit, beyond DynamoDB's 400 KB.
- Changing `name` doesn't update the public `displayName`, so they disagree.
- Deleting the profile directly skips `deleteMyAccount`'s clean-up of listings, bookings, reviews and photos.

React escapes text, so this isn't XSS.

**Suggested fix:** add an `updateMyProfile` Lambda that validates input, using the same rules as signup. Remove `update` and `delete` from the model rule, so `deleteMyAccount` is the only way to delete.

## 7. Low: tokens in localStorage

**Where:** `src/lib/index.ts:18`. `Amplify.configure` runs with the default token storage, which is localStorage.

**Risk:** if an XSS bug ever appears, a script could read the tokens. Today there's no `dangerouslySetInnerHTML` and React escapes all text, so the risk is low.

**Suggested fix:** the CSP in finding 2 is the main defence. Optionally switch to `CookieStorage` with `secure` and `sameSite: 'strict'`. Note that the cookies are still readable by script, since Amplify can't set httpOnly ones, so the CSP matters more.

## 8. Low: signup reveals existing accounts

**Where:** `src/lib/auth.ts:52`. Signup says "There's already an account with that email". Login correctly gives one message for both wrong email and wrong password.

**Risk:** someone can check whether an email is registered.

**Suggested fix:** usually acceptable for a marketplace, and it helps real users. If you want to close it, show "Check your email" in both cases, and send existing users a "you already have an account" email instead.

## 9. Low: no MFA and no Cognito threat protection

**Where:** `amplify/auth/resource.ts`. Email and password only, with Cognito's default password policy (8+ characters including upper case, lower case, a number and a symbol).

**Risk:** reused passwords from other breaches could open accounts. Cognito's built-in throttling slows this down but doesn't stop it.

**Suggested fix:**
- Later: offer optional TOTP MFA, which Cognito supports.
- Consider Cognito threat protection (the Plus tier), which blocks known-breached passwords and risky sign-ins.
- Phone checks (see `docs/trust-proposal.md`) add a second factor for trust, not for login.

## 10. Info: secrets

- **The repo has no secrets:**
  - No AWS keys, private keys or API tokens in tracked files. `git grep` found none.
  - `.env*` files are ignored, except `.env.production`, which holds only public settings: `VITE_SITE_URL` and `VITE_DATA_MODE`.
  - `amplify_outputs.json` is generated during the build and isn't committed. Its contents (pool IDs, API URL) are public by design.
- **The browser bundle has no secrets:** only `VITE_DATA_MODE`, `VITE_DEMO_DATA` and `VITE_SITE_URL` are read. The "secret" strings in `dist/assets` are AWS SDK code, not values.
- **Server-side secrets:** `PHONE_PEPPER` is an Amplify secret and never reaches the browser. The DLT IDs are environment variables, which is fine because they aren't secret.
- **Outside the repo:** a DesignMD API key was pasted into a chat on 2026-11-13. It's stored in `~/.claude.json`, not in the repo. Rotate it.

## 11. Info: CORS and CSRF

- **AppSync:** it accepts any origin, which is standard. Requests are authorized by a bearer token, not cookies, so cross-site request forgery doesn't apply.
- **S3:** I didn't check the bucket's CORS settings, because they're set by Amplify Storage. Confirm in the console that allowed origins are `https://www.rentigoo.in` (plus `localhost` for development) rather than `*`. A wildcard there is low risk for public photos, but it's tidier to restrict it.

---

## What's already right

- **Listings:** written only through `saveListing` and `deleteMyListing`, which set `ownerId` from the caller and check every field (`shared/listingRules.ts`: lengths, prices, deposit ≤ ₹5,00,000, up to 8 photos and 8 rules).
- **Bookings:**
  - The price is recomputed on the server (`bookings.ts:93`). The client never sends a price.
  - Booking your own listing, booking a paused listing, past dates and taken dates are all refused (`shared/bookingRules.ts`).
  - Only the two participants can act on a booking (`bookings.ts:113`).
  - Only the owner can mark rent as paid.
- **Reviews:** only after a completed rental, once per person per rental, a rating of 1–5, and 10–1,000 characters (`bookings.ts:169–180`).
- **Messages:**
  - The sender is set by the server, and only participants can read or post.
  - Messages are up to 2,000 characters; booking notes are trimmed to 500.
- **Private fields** stay private: full name, consent records, email.
  - Server-maintained fields are read-only for people: verification flags, ratings, booked dates.
- **Phone checks:**
  - Only an HMAC fingerprint of the number is stored, and the code is hashed.
  - Each code allows 5 tries and lasts 10 minutes; there's one resend a minute and 5 sends a day per account and per number.
  - The fixed test code works only in sandboxes (`amplify/backend.ts`, `SMS_MODE`).
- **IAM:** Lambda permissions are scoped (e.g. S3 deletes only under `listing-photos/`, Amplify builds only on `main`). Production refuses demo data (`npm run check:launch`).

## Suggested order

1. **Fix 1** (photo ownership) before real owners start uploading. Doing it with presigned uploads covers most of finding 3 too.
2. **Fix 2** (headers). It's a config-only change.
3. **Fix 4** (rate limits) and **fix 5** (owner messaging) before any promotion that brings many users.
4. **Fixes 6–9** when convenient.
