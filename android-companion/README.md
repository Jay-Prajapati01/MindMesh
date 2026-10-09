# MindMesh native Android companion

This is a standalone Kotlin + Jetpack Compose Android Studio project. It receives Android `ACTION_SEND` text URLs, stores pending saves in Room, uses WorkManager for network retry, and posts authenticated quick-save receipts through Retrofit/OkHttp.

Create an untracked `local.properties` with `MINDMESH_API_BASE_URL`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`, then open this directory in Android Studio. Add `mindmesh://auth/callback` in Supabase Auth redirect settings before testing authentication. For a physical phone, use a reachable HTTPS/LAN API URL or USB port forwarding; `localhost` by itself is the phone, not the development PC.
