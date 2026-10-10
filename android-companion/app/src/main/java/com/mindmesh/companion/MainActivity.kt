package com.mindmesh.companion

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import com.mindmesh.companion.share.SharedUrlParser
import com.mindmesh.companion.ui.MindMeshApp
import com.mindmesh.companion.ui.theme.MindMeshTheme

/**
 * Single-activity host. Share intents and the Google OAuth callback are pushed
 * into the view model instead of rebuilding the composition, so a link shared
 * while the app is open still reaches the save field.
 */
class MainActivity : ComponentActivity() {
    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handle(intent)
        setContent {
            MindMeshTheme {
                MindMeshApp(viewModel)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handle(intent)
    }

    private fun handle(intent: Intent) {
        if (intent.action == Intent.ACTION_SEND) {
            viewModel.onSharedLink(SharedUrlParser.from(intent))
        }
        val data = intent.data
        if (data != null && data.scheme == "mindmesh" && data.host == "auth") {
            viewModel.onAuthCallback(data)
        }
    }
}
