package com.mindmesh.companion.share

import android.content.Intent
import android.util.Patterns

object SharedUrlParser {
    private val supportedHosts = setOf("youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "instagram.com", "www.instagram.com", "m.instagram.com")

    fun from(intent: Intent?): String? {
        if (intent?.action != Intent.ACTION_SEND || intent.type != "text/plain") return null
        return extract(intent.getStringExtra(Intent.EXTRA_TEXT))
    }

    fun extract(text: String?): String? = text?.let { value ->
        Patterns.WEB_URL.matcher(value).takeIf { it.find() }?.group()?.trim()?.takeIf { url ->
            val host = runCatching { java.net.URI(url).host?.removePrefix("www.") }.getOrNull()
            url.startsWith("https://") && host != null && (host in supportedHosts || host.isNotBlank())
        }
    }
}
