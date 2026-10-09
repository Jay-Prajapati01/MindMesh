package com.mindmesh.companion

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import com.mindmesh.companion.share.SharedUrlParser
import com.mindmesh.companion.ui.MindMeshApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        render(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        render(intent)
    }

    private fun render(intent: Intent) = setContent {
        MaterialTheme { MindMeshApp(SharedUrlParser.from(intent), intent.data?.takeIf { it.scheme == "mindmesh" && it.host == "auth" }) }
    }
}
