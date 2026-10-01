package com.craigmcn.queueplayer

import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Looper
import androidx.core.content.ContextCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.common.util.concurrent.ListenableFuture

@CapacitorPlugin(name = "QueuePlayer")
class QueuePlayerPlugin : Plugin() {
    private var controllerFuture: ListenableFuture<MediaController>? = null

    // Screen-on while still locked is the "lock-screen player visible" case
    // that broke the web app, so log it separately from unlocking.
    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                Intent.ACTION_SCREEN_OFF -> EventLog.record("screen-off")
                Intent.ACTION_SCREEN_ON -> EventLog.record("screen-on")
                Intent.ACTION_USER_PRESENT -> EventLog.record("unlocked")
            }
        }
    }

    override fun load() {
        EventLog.context = context.applicationContext
        EventLog.onEntry = { entry -> notifyListeners("event", entry) }
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_USER_PRESENT)
        }
        ContextCompat.registerReceiver(context, screenReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
        val token = SessionToken(context, ComponentName(context, PlaybackService::class.java))
        controllerFuture = MediaController.Builder(context, token)
            .setApplicationLooper(Looper.getMainLooper())
            .buildAsync()
        EventLog.record("plugin-loaded")
    }

    override fun handleOnDestroy() {
        controllerFuture?.let { MediaController.releaseFuture(it) }
        context.unregisterReceiver(screenReceiver)
    }

    /** Runs [block] on the main thread once the controller is connected. */
    private fun withController(call: PluginCall, block: (MediaController) -> Unit) {
        val future = controllerFuture ?: return call.reject("player not ready")
        future.addListener({
            try {
                block(future.get())
            } catch (e: Exception) {
                call.reject(e.message ?: "player error")
            }
        }, ContextCompat.getMainExecutor(context))
    }

    @PluginMethod
    fun load(call: PluginCall) {
        val tracks = call.getArray("tracks") ?: return call.reject("tracks required")
        val rate = call.getFloat("rate", 1f) ?: 1f
        val items = (0 until tracks.length()).map { i ->
            val t = tracks.getJSONObject(i)
            val path = t.getString("path")
            MediaItem.Builder()
                .setMediaId(path)
                .setMediaMetadata(
                    MediaMetadata.Builder()
                        .setTitle(t.optString("title", path))
                        .setArtist(t.optString("artist", ""))
                        .build(),
                )
                .build()
        }
        withController(call) { c ->
            c.setMediaItems(items)
            c.repeatMode = Player.REPEAT_MODE_ALL
            c.setPlaybackSpeed(rate)
            c.prepare()
            EventLog.record("loaded", "${items.size} tracks")
            call.resolve()
        }
    }

    @PluginMethod
    fun play(call: PluginCall) = withController(call) { it.play(); call.resolve() }

    @PluginMethod
    fun pause(call: PluginCall) = withController(call) { it.pause(); call.resolve() }

    @PluginMethod
    fun next(call: PluginCall) = withController(call) {
        it.seekToNextMediaItem()
        EventLog.record("next")
        call.resolve()
    }

    @PluginMethod
    fun previous(call: PluginCall) = withController(call) {
        // seekToPreviousMediaItem, unlike seekToPrevious, always changes song.
        it.seekToPreviousMediaItem()
        EventLog.record("previous")
        call.resolve()
    }

    @PluginMethod
    fun setRate(call: PluginCall) = withController(call) {
        it.setPlaybackSpeed(call.getFloat("rate", 1f) ?: 1f)
        call.resolve()
    }

    @PluginMethod
    fun getState(call: PluginCall) = withController(call) {
        call.resolve(JSObject().apply {
            put("index", it.currentMediaItemIndex)
            put("playing", it.isPlaying)
        })
    }

    @PluginMethod
    fun getLog(call: PluginCall) {
        call.resolve(JSObject().apply { put("entries", EventLog.all()) })
    }

    @PluginMethod
    fun clearLog(call: PluginCall) {
        EventLog.clear()
        call.resolve()
    }
}
