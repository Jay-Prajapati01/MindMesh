# MindMesh website + companion app manual testing

Use a new test account for each account-isolation scenario. Do not use real provider keys, payment cards, or production promo codes while testing locally.

## Required setup

1. Apply `supabase/migrations/202610100001_commerce_byok_admin.sql` after the existing migrations.
2. In the backend secret environment, set a random `PROMO_HMAC_PEPPER` and a base64url encoded 32-byte `BYOK_ENCRYPTION_KEY`. Keep both out of source control.
3. To make one existing Supabase account the owner, set `OWNER_BOOTSTRAP_USER_ID` to that account's UUID, then sign in. Do not use a fixed email/password or a promo code for owner access.
4. Start Docker with `AUTH_ENABLED=true`, the same Supabase URL and publishable key used by the website, and the backend reachable from the Android device.
5. For an Android emulator use `MINDMESH_API_BASE_URL=http://10.0.2.2:8000/api/`. For a USB-connected phone run `adb reverse tcp:8000 tcp:8000` and use `http://127.0.0.1:8000/api/`. A phone on Wi-Fi requires an HTTPS public or LAN-reachable backend URL; `localhost` on the phone is the phone itself.

## Website accounts, plans, and isolation

1. Open `/signup`, create Account A, confirm email if required, and sign in.
2. Confirm the dashboard loads, the profile shows `Free plan`, and `/settings/usage` lists eight feature limits.
3. Add a note or source with Account A. Sign out and create Account B.
4. Confirm Account B cannot see, download, search, graph, or chat over Account A content.
5. Open `/pricing`. Confirm Free, Plus ₹299/month, and Pro ₹799/month are shown on the landing page and the dedicated pricing screen.
6. Confirm the Pricing navigation link works from the landing page and the sidebar.
7. Confirm `/settings/ai-providers` shows Groq and Gemini connection controls. Connect a disposable valid key; confirm only a masked last-four value appears after saving. Disconnect it and confirm it disappears.
8. Switch a connected provider to `Use my key`. Start a supported processing action and confirm its status message identifies either “your connected AI key” or “MindMesh managed resources.”
9. Verify that a missing or rejected BYOK key shows an actionable failure and does not silently switch to managed resources.

## Promo and admin controls

1. As the server-provisioned owner, open `/admin/promo-codes`. Confirm a normal account receives access denied.
2. Create a beta Pro promo and copy the revealed value immediately. Confirm the list later displays only a safe prefix, campaign, duration, cap, redemptions, and status.
3. Sign in as a different normal account, open `/pricing`, enter the promo, select an allowed plan, and confirm the effective plan and expiry appear in profile and usage.
4. Attempt to redeem the same promo again with that account; confirm it is rejected.
5. Confirm the redeemed account remains `member` and cannot open `/admin/promo-codes`.
6. Confirm no promo code can promote an account to owner or admin.

## Companion app v2.0.1

1. Install the v2 APK. On first launch, create an account or sign in with the same credentials used on the website.
2. Confirm the same email and current plan appear in the companion profile card. Sign in to the website and confirm the same plan and sources appear there.
3. Toggle Dark/Light in the companion header and relaunch the app. Confirm the complete companion palette changes and the preference persists.
4. Share a YouTube, Instagram, or web URL to MindMesh. Confirm it appears in the shared-link field.
5. Tap **Save to MindMesh**. Confirm the status progresses from Sending to Accepted/Processing and then Synced, without becoming Failed due to an unreachable API.
6. Confirm the accepted message says whether processing is using your connected AI key or MindMesh managed resources.
7. Confirm the saved item appears in the website Stored and Search views under the same account.
8. Turn off the backend or network briefly. Confirm the app shows an offline/retry message. Restore connectivity, tap Sync now, and confirm the same queued item continues rather than creating a duplicate.
9. Use **Upload document** and select a supported PDF, text, Office, or spreadsheet file. Confirm it reports success and appears in the website workspace under the same account.
10. Use **Upload audio** and select an audio file. Confirm it reports success and appears in the website workspace under the same account.
11. Sign out in the companion, sign in as a second account, and confirm the first account's queued/saved items and plan are not displayed.

## Payment readiness

1. Confirm paid cards do not claim a successful purchase while `PAYMENTS_ENABLED=false`.
2. Configure and verify Razorpay test credentials, server plan IDs, webhook secret, and signed webhook handling before enabling checkout for any customer.
3. Confirm a browser redirect alone does not change a plan; only a verified provider webhook may do so.
