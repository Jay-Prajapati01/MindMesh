# MindMesh native Android companion

The companion is a Kotlin + Jetpack Compose Android Studio project at `android-companion/`. It receives shared YouTube, Instagram, and webpage URLs via Android `ACTION_SEND`, then saves them to the existing account-scoped MindMesh backend.

## Configuration

Copy values from `android-companion/companion.properties.example` into the ignored `android-companion/local.properties`. Use the same public Supabase project URL and publishable key as the website. Never put a Supabase service-role key or AI-provider key in the mobile app.

Add `mindmesh://auth/callback` to Supabase Auth redirect URLs. Enable the Google provider there and use the provider callback shown by Supabase in Google Cloud Console.

For local USB phone testing, start the authenticated backend and run:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb reverse tcp:8000 tcp:8000
```

Set `MINDMESH_API_BASE_URL=http://127.0.0.1:8000/api/` in `local.properties`. The reverse mapping makes that phone loopback address point at the PC. A raw `localhost` address without ADB reverse points at the phone and will fail.

## Manual verification

1. Open `android-companion` in Android Studio and build/install the debug app.
2. Sign in with the same email/password or Google account used on the website.
3. Share a YouTube video, Instagram Reel, and normal webpage to MindMesh.
4. Confirm the save changes from queued to accepted and appears under the same account on the website.
5. Disable networking, share a URL, restore network, and reopen the app. WorkManager retries the Room-backed outbox.

The backend performs extraction, transcription, summary, embeddings, and indexing. The phone only persists and submits the URL.
