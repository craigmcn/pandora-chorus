# queue-player

Local Capacitor plugin for the native audio spike. It loops a list of bundled tracks with a native queue:

- **iOS:** `AVQueuePlayer`, with lock-screen controls via Now Playing and the remote command center.
- **Android:** a Media3 `ExoPlayer` in a `MediaSessionService`.

It keeps an event log natively (track changes, lock and screen state), so results stay accurate while the web view is paused.

Methods: `load({ tracks, rate })`, `play()`, `pause()`, `next()`, `previous()`, `setRate({ rate })`, `getState()`, `getLog()`, `clearLog()`. Each new log entry is also sent as an `event`.
