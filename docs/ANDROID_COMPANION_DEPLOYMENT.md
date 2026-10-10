# Android companion deployment configuration

The native Kotlin companion remains one codebase with package `com.mindmesh.companion`. AWS or GCP only changes its release `MINDMESH_API_BASE_URL`; it continues using the same Supabase project/public key and `mindmesh://auth/callback` redirect. Its encrypted store holds the refresh token and refreshes an expired session before background outbox sync. Configure production HTTPS before producing a release APK. Do not embed service-role, Qdrant, database, or AI secrets in Android build properties.
