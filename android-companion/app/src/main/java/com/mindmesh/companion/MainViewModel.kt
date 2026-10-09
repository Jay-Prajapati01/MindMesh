package com.mindmesh.companion

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.mindmesh.companion.auth.AuthSessionStore
import com.mindmesh.companion.data.MindMeshDatabase
import com.mindmesh.companion.data.QuickSave
import com.mindmesh.companion.share.SharedUrlParser
import com.mindmesh.companion.sync.QuickSaveWorker
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.util.UUID

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val context = application.applicationContext
    private val session = AuthSessionStore(context)
    private val database = MindMeshDatabase.create(context)
    val saves = database.quickSaves().observe(session.userId.orEmpty()).stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun queue(url: String, onNotice: (String) -> Unit) {
        val valid = SharedUrlParser.extract(url)
        val owner = session.userId
        if (valid == null) return onNotice("Enter a valid HTTPS URL.")
        if (owner == null) return onNotice("Sign in before saving links.")
        viewModelScope.launch {
            database.quickSaves().insert(QuickSave(UUID.randomUUID().toString(), owner, valid, source(valid)))
            QuickSaveWorker.enqueue(context)
            onNotice("Saved on device — syncing with MindMesh.")
        }
    }
    fun logout() = session.clear()
    private fun source(url: String) = when { "youtu" in url -> "youtube"; "instagram" in url -> "instagram"; else -> "web" }
}
