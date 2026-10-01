# Background Audio Spike

* Started 2026-10-01 on branch `spike/background-audio`
* Code: [`spikes/background-audio/`](../../spikes/background-audio/)

## Question

Can a PWA play a section loop, including starting each next track, while a phone or tablet is asleep or locked on its normal settings? This is a hard requirement (see the [Project Brief](../Project%20Brief.md) decisions). If no configuration works reliably on iOS, the plan switches to a Capacitor wrapper with a native audio plugin.

## What the test page does

It plays five 22-second MP3 tracks ("Song one. Alto." and so on, each with its own tune) as a loop. It logs every playback and page-lifecycle event, saved across reloads, with whether the page was visible or hidden at the time.

A **transition** is one track ending and the next one reaching `playing`. It is logged as ok, or as FAILED when the next track doesn't start within 10 seconds or `play()` is rejected. The Results section totals the transitions that happened while the screen was hidden or locked.

| Setting | Options | Why |
|---|---|---|
| Strategy | One `<audio>` element with `src` swapped on `ended` (default); or two elements, alternating | iOS may allow resuming an element that's already "unlocked" but not starting a fresh load |
| Source | Network (`?net=1` bypasses the service worker); service worker cache with byte-range responses (default); blob URLs from the cache | Offline practice needs a cached source, and iOS needs range responses for cached audio |
| Speed | 1×, 0.75× | Speed control is an MVP requirement; checks it survives track changes |
| Media Session | on (default) / off | Lock-screen title, play/pause and next/previous buttons |
| `audioSession.type = "playback"` | on (default) / off | Safari 17+ hint that this is media playback, not incidental sound |
| Repeat one | off (default) / on | The repeat-one-song control |

## How to run

**URL:** `https://pandora-chorus.craigmcn.com/` (GitHub Pages with a custom subdomain). It redeploys on every push to `spike/background-audio`.

1. Open the URL in the browser, then reload once so the service worker takes control (the top line should say "SW active").
2. Tap **Download for offline** and wait for "5/5 tracks cached".
3. To test the installed app:
   * **iOS/iPadOS:** Safari → Share → Add to Home Screen, then open it from the home screen.
   * **Android:** Chrome → menu → Install app.

   The installed app has its own storage, so repeat steps 1–2 inside it.

For each configuration:

1. Tap **Clear log**, choose the settings, and tap **Play**.
2. Lock the phone straight away and wait about 2½ minutes (five track changes). Listen for each new spoken label.
3. Optionally, press next/pause on the lock screen.
4. Unlock, read the Results line, and tap **Copy report**. Paste the report into the results below, or into a GitHub issue if it's long.

## Test order

Run the default configuration on every device first. Only try the alternatives if it fails.

1. **Default:** single element, service worker source, Media Session on, audioSession on, 1×.
2. Default at 0.75×.
3. Default in airplane mode (offline).
4. If the default fails: dual elements, then blob source, then audioSession off.
5. Network source once, to compare.

Devices: iPhone and iPad (Safari tab *and* installed), Android phone (Chrome tab *and* installed). Note the OS versions.

## Pass criteria

* **Pass:** on an iPhone *installed* PWA (the hardest case), the default configuration (or one alternative) completes 5/5 locked transitions on three separate runs. Lock-screen controls work and the speed setting holds. The same configuration also passes on iPad and Android.
* **Fail → Capacitor:** no configuration passes reliably on iOS.
* **Partial:** it works in a Safari tab but not installed (or the other way round). Decide then whether to steer members to one of them.

## Results

| Date | Device / OS | Browser or installed | Configuration | Locked transitions | Lock-screen controls | Notes |
|---|---|---|---|---|---|---|
| 2026-10-01 | macOS, desktop Chrome (headless) | Browser | All 6 strategy × source combinations | n/a (visible only, 3/3 ok each) | n/a | Smoke test only, re-run after switching to MP3; desktop can't lock |
| 2026-10-01 | iPhone, iOS 26.6.1 (Safari 26.6.1) | Installed | Default (single, SW cache, Media Session + audioSession on, 1×), version `5cab2bf` | Earlier runs: mostly ok | — | Earlier, informal runs (no report): with the lock-screen player **on screen** during a track change, the next track "played" with no sound and the loop stalled until the app was reopened |
| 2026-10-01 | iPhone, iOS 26.6.1 (Safari 26.6.1) | Installed | Default, version `5cab2bf` | 3/3 ok | Pause ok | Gaps between songs: 168 ms, 1080 ms, 1093 ms |
| 2026-10-01 | iPhone, iOS 26.6.1 (Safari 26.6.1) | Installed | Default, version `5cab2bf` | 2/3 ok | — | Lock-screen player on screen during some changes. 3→4 logged `stalled` 4 s after `play()` and only reached `playing` after 12.5 s, still locked: loading from the service worker stalled, not a refused `play()`. Other gaps ~1.1 s |
| 2026-10-01 | iPhone, iOS 26.6.1 (Safari 26.6.1) | Installed | Dual elements, SW cache, version `5cab2bf` | 2/2 ok | Confused | Gaps ~125 ms with no `waiting`: the preloaded element starts instantly. But a lock-screen play at 21:28:45 was logged while song 1 was already playing, and on unlock the *idle* preloaded element (song 2) started by itself alongside song 1. Lock-screen controls seem bound to the wrong element |
| 2026-10-01 | iPhone, iOS 26.6.1 (Safari 26.6.1) | Installed | Single, **blob** source, version `5cab2bf` | 1/2 ok | — | 2→3 `stalled` even though the track was already in memory, and only reached `playing` on unlock (24 s). So the stall isn't the service worker: iOS sometimes won't finish loading a *new* `src` while locked |
| 2026-10-01 | iPhone, iOS 26.6.1 (Chrome 154) | Chrome tab | Default, version `5cab2bf` | 4/4 ok | Pause/play ok ×2 | Gaps alternate ~125 ms / ~1.1 s, as in the installed app |
| 2026-10-01 | iPhone, iOS 26.6.1 (Safari 26.6.1) | Installed | Single, blob source, version `5cab2bf` | 0/1 ok | — | Same as the earlier blob run: 1→2 `stalled` 3.5 s after `play()` and only started on unlock (29 s). Single-element stalls are reproducible with any source |
| 2026-10-01 | iPhone, iOS 26.6.1 (Safari 26.6.1) | Installed | Single, blob source, version `5cab2bf` | 4/4 "ok" | — | Counted ok only because it was under the 10 s cut-off: 3→4 `stalled` and took **9.2 s** of silence. Other gaps 0.1–0.3 s |
| 2026-10-01 | iPhone, iOS 26.6.1 (Safari 26.6.1) | Installed | Dual + stray-play guard, SW cache, version `5e7b78d` | 3/3 ok (log) | **Broken** | No doubled audio and fast changes (~0.13 s), but the lock-screen player showed nothing playing while audio played. After a lock-screen play (21:47:59), audio stopped while the page still logged song 4 as playing: a silent failure the page can't detect |
| 2026-10-01 | Android (Chrome reports a frozen "Android 10; K"), Chrome 152 | Installed | Dual + guard, SW cache, version `5e7b78d` | 2/2 ok | Pause/play ok | Changes in ~5 ms. `audioSession` isn't supported on Android (not needed). Small sample |
| 2026-10-01 | iPhone 15, iOS 26.6.1 | **Native app** (Capacitor, AVQueuePlayer), version `a63da1a` | Default, 1× | 4/4 ok (all in background; log mislabels them "unlocked") | Pause/play ok | Gaps 8–25 ms, no stalls or waiting. 4→5 happened while the lock screen was being viewed. The "locked" flag uses protected-data availability, which lags the lock by ~10 s and flips back on Face ID at the lock screen, so the locked/unlocked tally is unreliable |
| 2026-10-01 |  |  |  |  |  |  |

## Findings so far

As of 2026-10-01, iPhone, iOS 26.6.1:

* **Single element:** the lock screen stays correct, but iOS often stalls loading the next track while locked. Stalls ranged from 9 s to "until unlock", in 6 of 17 locked track changes, with network, service worker and in-memory (blob) sources alike.
* **Dual elements:** track changes are instant because the next song is already loaded. But iOS ties its lock-screen player to one element, and alternating elements breaks that link: the controls showed nothing playing, and pressing play silenced the audio while the page believed it was playing. Pausing stray plays on the idle element didn't fix it.
* **Continuous stream** (songs joined into one file): rejected. Joining needs every track to have matching MP3 settings, which can't be guaranteed for arrangers' files.
* **Silent failures can't be detected:** in both failure modes, iOS can report `playing` with no sound, so the page can't notice and recover.
* **Android (one short run):** dual elements worked: 2/2 instant locked changes, lock-screen pause/play ok.

* **Native app (Capacitor, iOS):** AVQueuePlayer gave 4/4 near-gapless (8–25 ms) track changes in the background, including while the lock screen was viewed, and lock-screen pause/play worked. See [`spikes/native-audio/`](../../spikes/native-audio/).

**Conclusion:** no web-only configuration meets the background-audio requirement reliably on iOS. Per the pass criteria, this points to the Capacitor fallback with a native audio queue (AVQueuePlayer on iOS), pending a decision.

## Notes

* Test tracks are MP3 (128 kbps, 44.1 kHz stereo) to match the chorus's real learning tracks, which are mostly MP3.
* The service worker answers `Range` requests from the cache with sliced `206` responses. iOS Safari won't play cached audio served as a plain `200`, so the real app needs the same handling.
* Python's `http.server` doesn't support `Range`, so Chrome can't seek with it. Serve locally with something that supports ranges.
