package com.mindmesh.companion.network

import com.google.gson.Gson
import com.mindmesh.companion.BuildConfig
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

data class QuickSaveRequest(val url: String)
data class QuickSaveResponse(val item_id: String?, val job_id: String?, val status: String?)
data class QuickSaveStatus(val job_id: String?, val status: String?, val error: ErrorBody? = null)
data class ErrorBody(val message: String?)
data class ApiError(val detail: String?, val errorCode: String?)

interface MindMeshApi {
    @POST("mobile/quick-saves")
    suspend fun quickSave(@Header("Idempotency-Key") key: String, @Body request: QuickSaveRequest): QuickSaveResponse

    @GET("mobile/quick-saves/{jobId}")
    suspend fun status(@Path("jobId") jobId: String): QuickSaveStatus

    companion object {
        private val gson = Gson()

        fun create(token: () -> String?): MindMeshApi {
            val client = OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .addInterceptor(Interceptor { chain ->
                    val request = chain.request().newBuilder()
                        .header("X-MindMesh-Require-Auth", "true")
                        .apply { token()?.let { header("Authorization", "Bearer $it") } }
                        .build()
                    chain.proceed(request)
                })
                .build()
            return Retrofit.Builder()
                .baseUrl(BuildConfig.API_BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(MindMeshApi::class.java)
        }
    }
}

/** Reads `{detail, error_code}` out of a backend failure body. */
fun HttpException.apiError(): ApiError = runCatching {
    val raw = response()?.errorBody()?.string()
    if (raw.isNullOrBlank()) ApiError(null, null)
    else {
        @Suppress("UNCHECKED_CAST")
        val json = Gson().fromJson(raw, Map::class.java) as? Map<*, *>
        ApiError(
            detail = (json?.get("detail") as? String) ?: (json?.get("message") as? String) ?: json?.get("msg") as? String,
            errorCode = json?.get("error_code") as? String,
        )
    }
}.getOrDefault(ApiError(null, null))

/**
 * Reachability probe against the backend's public /health route. It never sends
 * the auth header, so it answers even when AUTH_ENABLED is not set yet — that
 * difference is exactly what the UI needs to explain.
 */
object BackendHealth {
    sealed interface Status {
        data object Checking : Status
        data class Online(val version: String?) : Status
        data class Unreachable(val reason: String) : Status
        data class Unexpected(val description: String) : Status
    }

    private val gson = Gson()
    private val client = OkHttpClient.Builder()
        .connectTimeout(4, TimeUnit.SECONDS)
        .readTimeout(4, TimeUnit.SECONDS)
        .build()

    suspend fun check(): Status = withContext(Dispatchers.IO) {
        val url = BuildConfig.API_BASE_URL.trimEnd('/') + "/health"
        try {
            client.newCall(Request.Builder().url(url).build()).execute().use { response ->
                val raw = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    return@withContext Status.Unexpected("Backend answered HTTP ${response.code} on /health.")
                }
                @Suppress("UNCHECKED_CAST")
                val json = runCatching { gson.fromJson(raw, Map::class.java) as? Map<*, *> }.getOrNull()
                val version = json?.get("version") as? String
                Status.Online(version)
            }
        } catch (error: Exception) {
            Status.Unreachable(
                "Backend not reachable at ${BuildConfig.API_BASE_URL} (${error.javaClass.simpleName}). " +
                    "Start it locally or fix MINDMESH_API_BASE_URL.",
            )
        }
    }
}
