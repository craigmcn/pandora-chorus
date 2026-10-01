package com.craigmcn.queueplayer

import android.app.KeyguardManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture

class PlaybackService : MediaSessionService() {
    companion object {
        const val TRANSITION_TIMEOUT_MS = 10_000L
    }

    private var session: MediaSession? = null
    private val handler = Handler(Looper.getMainLooper())
    private var pendingAt = 0L

    override fun onCreate() {
        super.onCreate()
        EventLog.context = applicationContext
        val attributes = AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build()
        val player = ExoPlayer.Builder(this)
            .setAudioAttributes(attributes, true)
            .setHandleAudioBecomingNoisy(true)
            .build()
        player.addListener(Listener(player))
        session = MediaSession.Builder(this, player).setCallback(Callback()).build()
        EventLog.record("service-created")
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = session

    override fun onDestroy() {
        session?.run {
            player.release()
            release()
        }
        session = null
        EventLog.record("service-destroyed")
        super.onDestroy()
    }

    /** Media items lose their URI when sent from a controller, so rebuild it
     *  from the mediaId (the path within the bundled web assets). */
    private class Callback : MediaSession.Callback {
        override fun onAddMediaItems(
            mediaSession: MediaSession,
            controller: MediaSession.ControllerInfo,
            mediaItems: MutableList<MediaItem>,
        ): ListenableFuture<MutableList<MediaItem>> = Futures.immediateFuture(
            mediaItems.map { it.buildUpon().setUri("asset:///public/${it.mediaId}").build() }.toMutableList(),
        )
    }

    private inner class Listener(private val player: ExoPlayer) : Player.Listener {
        private var current = 0

        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            val from = current
            current = player.currentMediaItemIndex
            EventLog.track = current
            if (reason != Player.MEDIA_ITEM_TRANSITION_REASON_AUTO) {
                EventLog.record("item", "reason $reason")
                return
            }
            val at = System.currentTimeMillis()
            pendingAt = at
            val locked = (getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager).isKeyguardLocked
            val finish = { ok: Boolean, reason: String ->
                if (pendingAt == at) {
                    pendingAt = 0
                    val gap = System.currentTimeMillis() - at
                    EventLog.record(
                        "transition",
                        "${if (ok) "ok" else "FAILED"} ${from + 1}→${current + 1} gap ${gap}ms $reason".trim(),
                        mapOf("ok" to ok, "lockedAtEnd" to locked, "gapMs" to gap),
                    )
                }
            }
            pendingFinish = { finish(true, "") }
            if (player.isPlaying) {
                finish(true, "")
            } else {
                handler.postDelayed({ finish(false, "not playing after 10s") }, TRANSITION_TIMEOUT_MS)
            }
        }

        override fun onIsPlayingChanged(isPlaying: Boolean) {
            EventLog.record(if (isPlaying) "playing" else "paused")
            if (isPlaying) pendingFinish?.invoke()
        }

        override fun onPlaybackStateChanged(playbackState: Int) {
            val name = when (playbackState) {
                Player.STATE_IDLE -> "idle"
                Player.STATE_BUFFERING -> "buffering"
                Player.STATE_READY -> "ready"
                Player.STATE_ENDED -> "ended"
                else -> "state $playbackState"
            }
            EventLog.record(name)
        }

        override fun onPlaybackParametersChanged(playbackParameters: androidx.media3.common.PlaybackParameters) {
            EventLog.record("rate", "${playbackParameters.speed}")
        }

        override fun onPlayerError(error: PlaybackException) {
            EventLog.record("error", error.message ?: error.errorCodeName)
        }
    }

    private var pendingFinish: (() -> Unit)? = null
}
