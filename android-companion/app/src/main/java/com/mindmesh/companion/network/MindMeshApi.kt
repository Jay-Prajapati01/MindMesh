package com.mindmesh.companion.network

import com.mindmesh.companion.BuildConfig
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

data class QuickSaveRequest(val url: String)
data class QuickSaveResponse(val item_id: String, val job_id: String, val status: String)
data class QuickSaveStatus(val job_id: String, val status: String, val error: ErrorBody? = null)
data class ErrorBody(val message: String)

interface MindMeshApi {
    @POST("mobile/quick-saves") suspend fun quickSave(@Header("Idempotency-Key") key: String, @Body request: QuickSaveRequest): QuickSaveResponse
    @GET("mobile/quick-saves/{jobId}") suspend fun status(@Path("jobId") jobId: String): QuickSaveStatus
    companion object {
        fun create(token: () -> String?): MindMeshApi {
            val client = OkHttpClient.Builder().addInterceptor(Interceptor { chain ->
                val request = chain.request().newBuilder().header("X-MindMesh-Require-Auth", "true").apply {
                    token()?.let { header("Authorization", "Bearer $it") }
                }.build()
                chain.proceed(request)
            }).build()
            return Retrofit.Builder().baseUrl(BuildConfig.API_BASE_URL).client(client).addConverterFactory(GsonConverterFactory.create()).build().create(MindMeshApi::class.java)
        }
    }
}
