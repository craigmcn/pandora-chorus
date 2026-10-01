# Background Audio Spike

* Started 2026-10-01 on branch `spike/background-audio`
* Code: [`spikes/background-audio/`](../../spikes/background-audio/)

## Question

Can a PWA play a section loop, including starting each next track, while a phone or tablet is asleep or locked on its normal settings? This is a hard requirement (see the [Project Brief](../Project%20Brief.md) decisions). If no configuration works reliably on iOS, the plan switches to a Capacitor wrapper with a native audio plugin.

## What the test page does

It plays five 22-second AAC tracks ("Song one. Alto." and so on, each with its own tune) as a loop. It logs every playback and page-lifecycle event, saved across reloads, with whether the page was visible or hidden at the time.

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
| 2026-10-01 | macOS, desktop Chrome (headless) | Browser | All 6 strategy × source combinations | n/a (visible only, 3/3 ok each) | n/a | Smoke test only; desktop can't lock |

## Notes

* Test tracks are AAC (`.m4a`) because Homebrew `ffmpeg` was broken locally (missing `libx265`) when they were generated. iOS treats MP3 and AAC the same for background playback.
* The service worker answers `Range` requests from the cache with sliced `206` responses. iOS Safari won't play cached audio served as a plain `200`, so the real app needs the same handling.
* Python's `http.server` doesn't support `Range`, so Chrome can't seek with it. Serve locally with something that supports ranges.
