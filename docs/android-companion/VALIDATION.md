# Native companion validation

The native companion is configured with Kotlin, Jetpack Compose, Retrofit/OkHttp, Room, WorkManager, and encrypted mobile session storage.

The debug APK is built from `android-companion/app/build/outputs/apk/debug/app-debug.apk`; the named installable copy is `android-companion/artifacts/MindMesh-native-companion-debug.apk`.

The current artifact compiled successfully on 9 October 2026 and was verified with Android SDK `apksigner` using APK Signature Scheme v2. It declares package `com.mindmesh.companion`, version `1.0.0`, and label `MindMesh`. SHA-256: `A211F6B603FF4DA53978671FC4BA74F1100A2A8F552DA436BB55DEAF946A9A08`.

The debug build is for local USB testing only; use a release signing key and production API URL before public distribution.
