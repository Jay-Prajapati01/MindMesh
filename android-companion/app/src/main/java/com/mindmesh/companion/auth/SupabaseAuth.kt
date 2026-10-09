package com.mindmesh.companion.auth

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.mindmesh.companion.BuildConfig
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.security.MessageDigest
import java.security.SecureRandom
import android.util.Base64

data class SignedInUser(val id: String, val email: String?)
data class SignInSession(val accessToken: String, val user: SignedInUser)

/** Uses Supabase's public auth API. Service-role keys and provider secrets are never embedded. */
object SupabaseAuth {
    private val client = OkHttpClient()
    private val gson = Gson()

    /** Builds a readable failure from Supabase's JSON error body ({error_description} / {msg} / {error_code}). */
    private fun httpFailure(httpCode: Int, rawBody: String?, fallback: String): Throwable {
        val detail = rawBody?.let { raw ->
            runCatching {
                @Suppress("UNCHECKED_CAST")
                val json = gson.fromJson(raw, Map::class.java) as? Map<String, Any?>
                json?.get("error_description") as? String
                    ?: json?.get("msg") as? String
                    ?: json?.get("error_code") as? String
            }.getOrNull()
        }?.takeIf { it.isNotBlank() }
        return IllegalStateException("$fallback ($httpCode)${detail?.let { ": $it" } ?: "."}")
    }

    suspend fun signIn(email: String, password: String): Result<SignInSession> = withContext(Dispatchers.IO) {
        runCatching {
            require(BuildConfig.SUPABASE_URL.isNotBlank() && BuildConfig.SUPABASE_PUBLISHABLE_KEY.isNotBlank()) { "Supabase is not configured for this build." }
            val body = gson.toJson(mapOf("email" to email.trim(), "password" to password)).toRequestBody("application/json".toMediaType())
            val request = Request.Builder().url("${BuildConfig.SUPABASE_URL.trimEnd('/')}/auth/v1/token?grant_type=password")
                .header("apikey", BuildConfig.SUPABASE_PUBLISHABLE_KEY).post(body).build()
            client.newCall(request).execute().use { response ->
                val raw = response.body?.string()
                if (!response.isSuccessful) throw httpFailure(response.code, raw, "Sign-in failed")
                val json = gson.fromJson(raw ?: error("Supabase returned an empty response."), Map::class.java)
                val user = json["user"] as? Map<*, *> ?: error("Supabase did not return a user.")
                SignInSession(json["access_token"] as? String ?: error("Supabase did not return a session."), SignedInUser(user["id"] as? String ?: error("Supabase user ID missing."), user["email"] as? String))
            }
        }
    }

    suspend fun signUp(email: String, password: String): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            require(BuildConfig.SUPABASE_URL.isNotBlank() && BuildConfig.SUPABASE_PUBLISHABLE_KEY.isNotBlank()) { "Supabase is not configured for this build." }
            val body = gson.toJson(mapOf("email" to email.trim(), "password" to password, "options" to mapOf("emailRedirectTo" to "mindmesh://auth/callback"))).toRequestBody("application/json".toMediaType())
            val request = Request.Builder().url("${BuildConfig.SUPABASE_URL.trimEnd('/')}/auth/v1/signup")
                .header("apikey", BuildConfig.SUPABASE_PUBLISHABLE_KEY).post(body).build()
            client.newCall(request).execute().use { if (!it.isSuccessful) throw httpFailure(it.code, it.body?.string(), "Sign-up failed") }
        }
    }

    fun googleIntent(context: Context): Intent {
        require(BuildConfig.SUPABASE_URL.isNotBlank()) { "Supabase is not configured for this build." }
        val verifier = ByteArray(32).also { SecureRandom().nextBytes(it) }.let { Base64.encodeToString(it, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP) }
        val challenge = MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray()).let { Base64.encodeToString(it, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP) }
        AuthSessionStore(context).savePkceVerifier(verifier)
        val uri = Uri.parse("${BuildConfig.SUPABASE_URL.trimEnd('/')}/auth/v1/authorize").buildUpon()
            .appendQueryParameter("provider", "google")
            .appendQueryParameter("redirect_to", "mindmesh://auth/callback")
            .appendQueryParameter("code_challenge", challenge)
            .appendQueryParameter("code_challenge_method", "s256").build()
        return Intent(Intent.ACTION_VIEW, uri)
    }

    suspend fun completeGoogle(context: Context, callback: Uri): Result<SignInSession> = withContext(Dispatchers.IO) {
        runCatching {
            val code = callback.getQueryParameter("code") ?: error(callback.getQueryParameter("error_description") ?: "Google sign-in did not return a code.")
            val verifier = AuthSessionStore(context).takePkceVerifier() ?: error("The sign-in verifier was unavailable. Start Google sign-in again.")
            val body = gson.toJson(mapOf("auth_code" to code, "code_verifier" to verifier)).toRequestBody("application/json".toMediaType())
            val request = Request.Builder().url("${BuildConfig.SUPABASE_URL.trimEnd('/')}/auth/v1/token?grant_type=pkce")
                .header("apikey", BuildConfig.SUPABASE_PUBLISHABLE_KEY).post(body).build()
            client.newCall(request).execute().use { response ->
                val raw = response.body?.string()
                if (!response.isSuccessful) throw httpFailure(response.code, raw, "Google sign-in failed")
                val json = gson.fromJson(raw ?: error("Supabase returned an empty response."), Map::class.java)
                val user = json["user"] as? Map<*, *> ?: error("Supabase did not return a user.")
                SignInSession(json["access_token"] as? String ?: error("Supabase did not return a session."), SignedInUser(user["id"] as? String ?: error("Supabase user ID missing."), user["email"] as? String))
            }
        }
    }
}
