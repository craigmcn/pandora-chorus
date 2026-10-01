package com.craigmcn.queueplayer

import android.app.KeyguardManager
import android.content.Context
import android.os.PowerManager
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject

/** In-process log shared by the service and the plugin; kept natively so it
 *  stays accurate while the web view is paused. */
object EventLog {
    private val entries = mutableListOf<JSObject>()
    var onEntry: ((JSObject) -> Unit)? = null
    var context: Context? = null

    @Volatile var track = 0

    @Synchronized
    fun record(ev: String, detail: String = "", extra: Map<String, Any> = emptyMap()) {
        val ctx = context
        val entry = JSObject().apply {
            put("t", System.currentTimeMillis())
            put("ev", ev)
            put("detail", detail)
            put("track", track + 1)
            if (ctx != null) {
                put("locked", (ctx.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager).isKeyguardLocked)
                put("screenOn", (ctx.getSystemService(Context.POWER_SERVICE) as PowerManager).isInteractive)
            }
            for ((k, v) in extra) put(k, v)
        }
        entries.add(entry)
        if (entries.size > 500) entries.removeAt(0)
        onEntry?.invoke(entry)
    }

    @Synchronized
    fun all(): JSArray = JSArray().apply { entries.forEach { put(it) } }

    @Synchronized
    fun clear() = entries.clear()
}
