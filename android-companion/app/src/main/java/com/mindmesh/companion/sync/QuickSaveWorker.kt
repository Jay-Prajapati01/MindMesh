package com.mindmesh.companion.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.Constraints
import com.mindmesh.companion.auth.AuthSessionStore
import com.mindmesh.companion.data.MindMeshDatabase
import com.mindmesh.companion.network.MindMeshApi

class QuickSaveWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val session = AuthSessionStore(applicationContext)
        if (session.accessToken == null) return Result.retry()
        val dao = MindMeshDatabase.create(applicationContext).quickSaves()
        val api = MindMeshApi.create { session.accessToken }
        return runCatching {
            dao.pending().forEach { item ->
                val receipt = api.quickSave(item.id, com.mindmesh.companion.network.QuickSaveRequest(item.url))
                dao.update(item.id, receipt.status, "Accepted by MindMesh", receipt.job_id)
            }
        }.fold(onSuccess = { Result.success() }, onFailure = { Result.retry() })
    }
    companion object {
        fun enqueue(context: Context) {
            val request = OneTimeWorkRequestBuilder<QuickSaveWorker>().setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build()
            WorkManager.getInstance(context).enqueueUniqueWork("mindmesh-quick-save", ExistingWorkPolicy.KEEP, request)
        }
    }
}
