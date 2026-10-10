# Native companion validation

The native companion is configured with Kotlin, Jetpack Compose, Retrofit/OkHttp, Room, WorkManager, and encrypted mobile session storage.

## Artifact

The debug APK is built from `android-companion/app/build/outputs/apk/debug/app-debug.apk`; the named installable copy is `android-companion/artifacts/MindMesh-native-companion-debug.apk`.

The current artifact compiled successfully on **10 October 2026** and was verified with Android SDK `apksigner` using APK Signature Scheme v2. It declares package `com.mindmesh.companion`, version `1.0.0`. Size: 11,032,233 bytes. SHA-256: `554701986A7CED0BCCEFCF0212EA06FA577BA3F5395EEEE9728DC46B86AD49E3`. Signer certificate SHA-256: `b061832cba0758200bed4a6e58b51730ec3fb613f4dd29bb71869e58a0e27fb7` (Android Debug).

Reproduce:

```powershell
cd android-companion
.\gradlew.bat testDebugUnitTest assembleDebug
Copy-Item app\build\outputs\apk\debug\app-debug.apk artifacts\MindMesh-native-companion-debug.apk -Force
& "$env:LOCALAPPDATA\Android\Sdk\build-tools\35.0.1\apksigner.bat" verify --verbose artifacts\MindMesh-native-companion-debug.apk
```

## Automated results (10 October 2026)

| Suite | Command | Result |
| --- | --- | --- |
| Android JVM unit tests | `.\gradlew.bat testDebugUnitTest` | **41 passed** — share-intent parsing, HTTP→state mapping, status labels, auth error copy, relative timestamps |
| Android debug build | `.\gradlew.bat assembleDebug` | **BUILD SUCCESSFUL**, no compiler errors |
| Backend API suite | `cd backend; python -m pytest -q` | **283 passed, 7 failed** |
| Live contract probes | `uvicorn app.main:app` + `mm_probe.py` | see below |

The 7 backend failures are pre-existing and environment-dependent, unrelated to the companion: 6 `test_gcp_backend.py` Postgres job tests (no local Postgres) and 1 `test_local_accounts.py` vector test (`'QdrantClient' object has no attribute 'search'` — qdrant-client API drift). They fail identically with `AUTH_ENABLED=false`, so they are not caused by the companion's auth requirement.

`backend/tests/conftest.py` pins `AUTH_ENABLED=false` for the default suite because `app.main` builds its middleware stack at import time; `backend/.env` carries `AUTH_ENABLED=true` for the companion. Set `AUTH_ENABLED` explicitly in the process environment to run the suite in auth mode.

## Live contract probes

Backend started locally with `AUTH_ENABLED=true`:

| Request | Response |
| --- | --- |
| `GET /api/health` (no auth header) | `200 {"status":"ok",...}` |
| `POST /api/mobile/quick-saves` without `Authorization` | `401 {"detail":"Sign in required","error_code":"AUTH_REQUIRED"}` |
| `POST /api/mobile/quick-saves` with a bogus bearer token | `401 {"detail":"Invalid session","error_code":"AUTH_INVALID"}` |
| `GET /api/mobile/quick-saves/{jobId}` with a bogus bearer token | `401 {"detail":"Invalid session","error_code":"AUTH_INVALID"}` |

Before the fix, every companion request returned `503 AUTH_CONFIGURATION_REQUIRED` because `backend/.env` had no `AUTH_ENABLED` (the setting defaults to `False`). The app now explains that exact condition in its failure copy, and the backend health chip reports reachability independently of auth.

The `202 {item_id, job_id, status}` happy path requires a real Supabase session; it was not exercised against the live project (no device attached, no test credentials in the repository). `backend/tests/test_mobile_quick_saves.py` covers that contract in-process (2 passed).

## Manual verification still required on a device

No device or emulator was attached during this run, so the following remain pending:

1. Install the APK, sign in with the website account.
2. Share a YouTube short, an Instagram reel, and a normal webpage to MindMesh.
3. Confirm the save moves queued → sending → accepted → processing → synced in the app, and appears under the same account on the website.
4. Turn off networking, share a URL, restore networking, reopen the app: the queued save uploads on its own.
5. Force a backend stop mid-sync: the save shows "Backend offline" with a Retry button instead of an endless "syncing" state.

The backend performs extraction, transcription, summary, embeddings, and indexing. The phone only persists and submits the URL.

The debug build is for local USB testing only; use a release signing key and production API URL before public distribution.
