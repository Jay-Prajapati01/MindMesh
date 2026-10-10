# MindMesh native Android companion

The companion is a Kotlin + Jetpack Compose Android Studio project at `android-companion/`. It receives shared YouTube, Instagram, and webpage URLs via Android `ACTION_SEND`, then saves them to the existing account-scoped MindMesh backend. Every save reports its own status inside the app, so the phone never has to open the website to check whether a share landed.

## Screens

| Screen | Purpose |
| --- | --- |
| Welcome | Brand entry point with sign-in, account creation and Google |
| Sign in | Email/password + Google; explains how to get a reset link |
| Create account | Email/password with confirmation; explains the "check your inbox" state |
| Confirm email | Waiting state after `signUp` needs email verification, with resend |
| Home | Share target: draft field, **Save to MindMesh**, live status list, backend health chip |

Sharing while signed out opens the auth flow with the link preserved; it is shown as a "Shared link waiting" card and lands in the draft field as soon as you are in. Signing in never auto-saves — the user taps **Save to MindMesh**, so nothing is uploaded without intent.

## Save status truth table

Room is the source of truth and the UI only renders what the worker actually recorded:

| State | Pill | Meaning |
| --- | --- | --- |
| `queued` | On device | Saved locally, upload not attempted yet |
| `uploading` | Sending | POST `/mobile/quick-saves` in flight |
| `accepted` | Accepted | Backend returned a job id (202) |
| `processing` | Processing | Job polled as queued/running |
| `synced` | Synced | Job completed — in the MindMesh library |
| `failed` | Failed | Rejected/failed; retry offered |
| `offline` | Backend offline | No route to the API; retry offered |
| `auth_error` | Needs sign-in | Session rejected; sign in again to resume |

There is no permanent "syncing" state: unreachable backends, 4xx rejections and dead sessions all become explicit, retryable rows.

## Backend requirement

The companion sends `X-MindMesh-Require-Auth: true`, which the API rejects with `503 AUTH_CONFIGURATION_REQUIRED` unless the backend runs with `AUTH_ENABLED=true` (it defaults to `False` in `backend/app/core/config.py`). `backend/.env` now sets it, `docker-compose.yml` already did, and `backend/.env.example` documents it:

```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
curl http://127.0.0.1:8000/api/health
```

`GET /api/health` is public, so the app's backend chip can tell "offline" apart from "not signed in".

## Configuration

Copy values from `android-companion/companion.properties.example` into the ignored `android-companion/local.properties`. Use the same public Supabase project URL and publishable key as the website. Never put a Supabase service-role key or AI-provider key in the mobile app.

Add `mindmesh://auth/callback` to Supabase Auth redirect URLs. Enable the Google provider there and use the provider callback shown by Supabase in Google Cloud Console.

For local USB phone testing, start the authenticated backend and run:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb reverse tcp:8000 tcp:8000
```

Set `MINDMESH_API_BASE_URL=http://127.0.0.1:8000/api/` in `local.properties`. The reverse mapping makes that phone loopback address point at the PC. A raw `localhost` address without ADB reverse points at the phone and will fail.

## Build and test

```powershell
cd android-companion
.\gradlew.bat testDebugUnitTest   # 41 JVM unit tests
.\gradlew.bat assembleDebug       # app/build/outputs/apk/debug/app-debug.apk
```

Release of the validation run, artifact hash and live contract probes: `docs/android-companion/VALIDATION.md`.

## Manual verification

1. Open `android-companion` in Android Studio and build/install the debug app.
2. Sign in with the same email/password or Google account used on the website.
3. Share a YouTube video, Instagram Reel, and normal webpage to MindMesh.
4. Confirm the save changes from queued to accepted and appears under the same account on the website.
5. Disable networking, share a URL, restore network, and reopen the app. WorkManager retries the Room-backed outbox.
6. Stop the backend and tap **Sync now**: rows must read "Backend offline" with a Retry button, not a permanent "syncing" state.

The backend performs extraction, transcription, summary, embeddings, and indexing. The phone only persists and submits the URL.
