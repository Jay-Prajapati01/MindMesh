# MindMesh native Android companion

This is a standalone Kotlin + Jetpack Compose Android Studio project. It receives Android `ACTION_SEND` text URLs, stores pending saves in Room, uses WorkManager for network retry, and posts authenticated quick-save receipts through Retrofit/OkHttp.

## Screens and flow

Welcome → Sign in / Create account / Confirm email → Home. The home screen is the share target: a shared link lands in the draft field and the user taps **Save to MindMesh** (nothing uploads automatically). Every save row shows its real state — On device, Sending, Accepted, Processing, Synced, Failed, Backend offline or Needs sign-in — driven only by what the worker recorded in Room, plus a backend health chip backed by the public `GET /api/health`.

Sharing while signed out keeps the link and offers it back after sign-in.

## Build and test

```powershell
.\gradlew.bat testDebugUnitTest   # JVM unit tests (41)
.\gradlew.bat assembleDebug       # app/build/outputs/apk/debug/app-debug.apk
```

## Backend requirement

The API answers `503 AUTH_CONFIGURATION_REQUIRED` to companion requests unless the backend runs with `AUTH_ENABLED=true`. That value is set in `backend/.env` (and by `docker-compose.yml`); see `backend/.env.example`. Start it with:

```powershell
cd ..\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Configuration

Create an untracked `local.properties` with `MINDMESH_API_BASE_URL`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`, then open this directory in Android Studio. Add `mindmesh://auth/callback` in Supabase Auth redirect settings before testing authentication. For a physical phone, use a reachable HTTPS/LAN API URL or USB port forwarding; `localhost` by itself is the phone, not the development PC.

Full docs: `docs/android-companion/README.md`. Latest validation run: `docs/android-companion/VALIDATION.md`.
