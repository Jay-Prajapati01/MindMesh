package com.mindmesh.companion.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import android.net.Uri
import com.mindmesh.companion.auth.AuthSessionStore
import com.mindmesh.companion.data.QuickSave
import com.mindmesh.companion.share.SharedUrlParser
import com.mindmesh.companion.sync.QuickSaveWorker
import java.util.UUID
import kotlinx.coroutines.launch

/** Minimal companion surface: website auth owns identity; the app receives, queues and syncs shares. */
@androidx.compose.runtime.Composable
fun MindMeshApp(sharedUrl: String?, authCallback: Uri?) {
    val context = LocalContext.current
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    val session = remember { AuthSessionStore(context) }
    var signedIn by remember { mutableStateOf(session.userId != null) }
    var url by remember { mutableStateOf(sharedUrl.orEmpty()) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val saves by remember(signedIn) {
        com.mindmesh.companion.data.MindMeshDatabase.create(context).quickSaves().observe(if (signedIn) session.userId.orEmpty() else "")
    }.collectAsState(initial = emptyList())
    var notice by remember { mutableStateOf(if (sharedUrl == null) "Share a link from YouTube, Instagram, or your browser." else "Shared link ready to save.") }
    androidx.compose.runtime.LaunchedEffect(authCallback) {
        if (authCallback != null && session.userId == null) {
            com.mindmesh.companion.auth.SupabaseAuth.completeGoogle(context, authCallback)
                .onSuccess { session.save(it.user.id, it.accessToken); signedIn = true; notice = "Signed in as ${it.user.email}." }
                .onFailure { notice = it.message ?: "Google sign-in failed (${it.javaClass.simpleName})." }
        }
    }
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("MindMesh", style = androidx.compose.material3.MaterialTheme.typography.headlineLarge)
        if (!signedIn) {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Sign in with your existing MindMesh account")
                    OutlinedTextField(email, { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(password, { password = it }, label = { Text("Password") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    Button(onClick = {
                        scope.launch {
                            com.mindmesh.companion.auth.SupabaseAuth.signIn(email, password)
                                .onSuccess { session.save(it.user.id, it.accessToken); signedIn = true; notice = "Signed in as ${it.user.email}." }
                                .onFailure { notice = it.message ?: "Sign-in failed." }
                        }
                    }) { Text("Sign in") }
                    Button(onClick = {
                        scope.launch {
                            com.mindmesh.companion.auth.SupabaseAuth.signUp(email, password)
                                .onSuccess { notice = "Check your email to confirm your MindMesh account." }
                                .onFailure { notice = it.message ?: "Sign-up failed." }
                        }
                    }) { Text("Create account") }
                    Button(onClick = { runCatching { context.startActivity(com.mindmesh.companion.auth.SupabaseAuth.googleIntent(context)) }.onFailure { notice = it.message ?: "Google sign-in could not start." } }) { Text("Continue with Google") }
                }
            }
        }
        OutlinedTextField(value = url, onValueChange = { url = it }, label = { Text("Shared HTTPS link") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
        Button(onClick = {
            val valid = SharedUrlParser.extract(url)
            val owner = session.userId
            if (valid == null) notice = "Enter a valid HTTPS URL."
            else if (owner == null) notice = "Sign in is required before MindMesh can save this link."
            else {
                val database = com.mindmesh.companion.data.MindMeshDatabase.create(context)
                kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch {
                    database.quickSaves().insert(QuickSave(UUID.randomUUID().toString(), owner, valid, source(valid)))
                    QuickSaveWorker.enqueue(context)
                }
                notice = "Saved on device — syncing with MindMesh."
            }
        }, enabled = url.isNotBlank()) { Text("Save to MindMesh") }
        Text(notice)
        if (signedIn) {
            Text("Recent saves", style = androidx.compose.material3.MaterialTheme.typography.titleMedium)
            saves.take(8).forEach { item -> Text("${item.state}: ${item.url}") }
        }
        if (signedIn) Button(onClick = { session.clear(); signedIn = false; notice = "Signed out." }) { Text("Sign out") }
    }
}

private fun source(url: String) = when {
    "youtube" in url || "youtu.be" in url -> "youtube"
    "instagram" in url -> "instagram"
    else -> "web"
}
