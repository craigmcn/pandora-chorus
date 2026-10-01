"use strict";

const TRACKS = [1, 2, 3, 4, 5].map((n) => ({
  title: `Song ${n}`,
  part: "Alto",
  path: `audio/song${n}-alto.mp3`,
}));
const AUDIO_CACHE = "spike-audio-v2";
// Replaced with the commit and deploy time by the Pages workflow.
const BUILD = "dev";
const LOG_KEY = "spike-log";
const SETTINGS_KEY = "spike-settings";
// A transition with no "playing" event after this long counts as failed.
const TRANSITION_TIMEOUT_MS = 10000;

const $ = (id) => document.getElementById(id);

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage blocked: the log still shows for this page load.
  }
}

const settings = {
  strategy: "single",
  source: "sw",
  speed: "1",
  mediaSession: true,
  audioSession: true,
  repeatOne: false,
  ...loadJson(SETTINGS_KEY, {}),
};
const state = { index: 0, active: 0, pending: null, blobUrls: new Map() };
const elements = [new Audio(), new Audio()];
const trackOf = new Map();
let log = loadJson(LOG_KEY, []);

const standalone =
  window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

// ---- Logging ----------------------------------------------------------------

function record(ev, detail = "", data = undefined, track = state.index) {
  const entry = { t: Date.now(), ev, track: track + 1, vis: document.visibilityState, detail };
  if (data) entry.data = data;
  log.push(entry);
  if (log.length > 500) log = log.slice(-500);
  saveJson(LOG_KEY, log);
  renderEntry(entry);
  renderSummary();
}

function formatEntry(e) {
  const time = new Date(e.t).toISOString().slice(11, 23);
  return `${time} ${e.ev} T${e.track} [${e.vis}]${e.detail ? " " + e.detail : ""}`;
}

function renderEntry(e) {
  const li = document.createElement("li");
  li.textContent = formatEntry(e);
  if (e.vis === "hidden") li.className = "hidden-vis";
  $("log").prepend(li);
}

function renderSummary() {
  const transitions = log.filter((e) => e.ev === "transition");
  const count = (hidden, ok) =>
    transitions.filter((e) => e.data.hiddenAtEnd === hidden && e.data.ok === ok).length;
  const hiddenOk = count(true, true);
  const hiddenFail = count(true, false);
  const summary = $("summary");
  summary.textContent =
    `While hidden/locked: ${hiddenOk} ok, ${hiddenFail} failed. ` +
    `While visible: ${count(false, true)} ok, ${count(false, false)} failed.`;
  summary.className = hiddenFail ? "bad" : hiddenOk ? "ok" : "";
}

function finishTransition(ok, reason = "") {
  const p = state.pending;
  if (!p) return;
  state.pending = null;
  const gapMs = Date.now() - p.t;
  const detail = `${ok ? "ok" : "FAILED"} ${p.from + 1}→${p.to + 1} gap ${gapMs}ms${reason ? " " + reason : ""}`;
  record("transition", detail, { ok, gapMs, hiddenAtEnd: p.hiddenAtEnd }, p.to);
}

function checkStalePending() {
  if (state.pending && Date.now() - state.pending.t > TRANSITION_TIMEOUT_MS) {
    finishTransition(false, "no playing event");
  }
}

// ---- Playback ---------------------------------------------------------------

function activeEl() {
  return settings.strategy === "single" ? elements[0] : elements[state.active];
}

function srcFor(i) {
  const { path } = TRACKS[i];
  if (settings.source === "network") return `${path}?net=1`;
  if (settings.source === "blob") {
    const url = state.blobUrls.get(i);
    if (url) return url;
    record("warning", "blob URL missing; download for offline first");
  }
  return path;
}

function setSrc(el, i) {
  el.src = srcFor(i);
  trackOf.set(el, i);
  // Loading a new src resets playbackRate to defaultPlaybackRate.
  el.defaultPlaybackRate = Number(settings.speed);
  el.playbackRate = Number(settings.speed);
  el.preservesPitch = true;
}

function nextIndex(i) {
  return settings.repeatOne ? i : (i + 1) % TRACKS.length;
}

function startTrack(i) {
  state.index = i;
  let el;
  if (settings.strategy === "single") {
    el = elements[0];
    setSrc(el, i);
  } else {
    const old = elements[state.active];
    el = elements[1 - state.active];
    if (!old.paused) old.pause();
    if (trackOf.get(el) !== i) setSrc(el, i);
    state.active = 1 - state.active;
  }
  updateMediaSession();
  renderNowPlaying();
  el.play().catch((err) => {
    record("play-rejected", `${err.name}: ${err.message}`);
    finishTransition(false, `play() rejected (${err.name})`);
  });
  if (settings.strategy === "dual") setSrc(elements[1 - state.active], nextIndex(i));
}

function onEnded(el) {
  if (el !== activeEl()) return;
  const from = state.index;
  const to = nextIndex(from);
  record("ended", "", undefined, from);
  const pending = { from, to, t: Date.now(), hiddenAtEnd: document.visibilityState === "hidden" };
  state.pending = pending;
  startTrack(to);
  // Timers are throttled or frozen while locked; checkStalePending on
  // visibilitychange catches the case where this never runs in time.
  setTimeout(() => {
    if (state.pending === pending) finishTransition(false, "no playing event");
  }, TRANSITION_TIMEOUT_MS);
}

function skip(delta) {
  state.pending = null;
  startTrack((state.index + delta + TRACKS.length) % TRACKS.length);
}

function stopAll() {
  state.pending = null;
  for (const el of elements) {
    el.pause();
    el.removeAttribute("src");
    el.load();
    trackOf.delete(el);
  }
  renderNowPlaying();
}

for (const [slot, el] of elements.entries()) {
  el.preload = "auto";
  for (const ev of ["play", "pause", "waiting", "stalled"]) {
    el.addEventListener(ev, () => {
      if (trackOf.has(el)) record(ev, `slot ${slot}`, undefined, trackOf.get(el));
      renderNowPlaying();
    });
  }
  el.addEventListener("playing", () => {
    record("playing", `slot ${slot} rate ${el.playbackRate}`, undefined, trackOf.get(el));
    if (state.pending && trackOf.get(el) === state.pending.to) finishTransition(true);
    renderNowPlaying();
  });
  el.addEventListener("ended", () => onEnded(el));
  // iOS can aim lock-screen play at the idle, preloaded element in dual
  // mode; stop it so two songs never play at once.
  el.addEventListener("play", () => {
    if (settings.strategy === "dual" && el !== activeEl()) {
      el.pause();
      record("stray-play", `slot ${slot} paused`, undefined, trackOf.get(el));
    }
  });
  // Tell iOS the real state so lock-screen play/pause follows the active element.
  for (const ev of ["playing", "pause"]) {
    el.addEventListener(ev, () => {
      if ("mediaSession" in navigator && el === activeEl()) {
        navigator.mediaSession.playbackState = el.paused ? "paused" : "playing";
      }
    });
  }
  el.addEventListener("error", () => {
    if (!trackOf.has(el)) return;
    const err = el.error;
    record("error", `slot ${slot} code ${err?.code} ${err?.message ?? ""}`, undefined, trackOf.get(el));
  });
}

// ---- Media Session / Audio Session -------------------------------------------

function updateMediaSession() {
  if (!("mediaSession" in navigator)) return;
  if (!settings.mediaSession) {
    navigator.mediaSession.metadata = null;
    return;
  }
  const track = TRACKS[state.index];
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: `Pandora Chorus · ${track.part}`,
    album: "Background audio spike",
    artwork: [{ src: "icon-512.png", sizes: "512x512", type: "image/png" }],
  });
}

function setupMediaSessionHandlers() {
  if (!("mediaSession" in navigator)) return;
  const actions = {
    play: () => activeEl().play(),
    pause: () => activeEl().pause(),
    previoustrack: () => skip(-1),
    nexttrack: () => skip(1),
  };
  for (const [action, fn] of Object.entries(actions)) {
    const handler = () => {
      record(`media-session:${action}`);
      fn();
    };
    try {
      navigator.mediaSession.setActionHandler(action, settings.mediaSession ? handler : null);
    } catch {
      // Action not supported on this browser.
    }
  }
  updateMediaSession();
}

function applyAudioSession() {
  if ("audioSession" in navigator) {
    navigator.audioSession.type = settings.audioSession ? "playback" : "auto";
  }
}

// ---- Offline cache -----------------------------------------------------------

async function updateCacheStatus() {
  if (!("caches" in window)) {
    $("cacheStatus").textContent = "Cache API unavailable (needs HTTPS)";
    return 0;
  }
  const cache = await caches.open(AUDIO_CACHE);
  let n = 0;
  for (const t of TRACKS) if (await cache.match(t.path)) n++;
  $("cacheStatus").textContent = `${n}/${TRACKS.length} tracks cached`;
  return n;
}

async function prepareBlobUrls() {
  for (const url of state.blobUrls.values()) URL.revokeObjectURL(url);
  state.blobUrls.clear();
  if (!("caches" in window)) return;
  // Built ahead of time: awaiting the cache inside "ended" could itself break
  // the hand-off to the next track while locked.
  const cache = await caches.open(AUDIO_CACHE);
  for (const [i, t] of TRACKS.entries()) {
    const res = await cache.match(t.path);
    if (res) state.blobUrls.set(i, URL.createObjectURL(await res.blob()));
  }
}

$("download").addEventListener("click", async () => {
  try {
    const cache = await caches.open(AUDIO_CACHE);
    await cache.addAll(TRACKS.map((t) => t.path));
    record("downloaded");
  } catch (err) {
    record("download-failed", String(err));
  }
  await updateCacheStatus();
  if (settings.source === "blob") await prepareBlobUrls();
});

// ---- UI ----------------------------------------------------------------------

function renderNowPlaying() {
  const el = activeEl();
  const playing = trackOf.has(el) && !el.paused;
  $("playPause").textContent = playing ? "Pause" : "Play";
  const t = TRACKS[state.index];
  $("nowPlaying").textContent = trackOf.has(el)
    ? `${playing ? "Playing" : "Paused"}: ${t.title} (${t.part})`
    : `Stopped. Next: ${t.title} (${t.part})`;
}

function renderEnv() {
  const parts = [
    standalone ? "Installed (standalone)" : "Browser tab",
    `SW ${navigator.serviceWorker?.controller ? "active" : "not controlling"}`,
    `mediaSession ${"mediaSession" in navigator ? "yes" : "no"}`,
    `audioSession ${"audioSession" in navigator ? "yes" : "no"}`,
    navigator.userAgent,
  ];
  $("env").textContent = parts.join(" · ");
}

function bindSettings() {
  for (const name of ["strategy", "source"]) {
    for (const input of document.querySelectorAll(`input[name=${name}]`)) {
      input.checked = input.value === settings[name];
      input.addEventListener("change", async () => {
        settings[name] = input.value;
        saveJson(SETTINGS_KEY, settings);
        stopAll();
        if (name === "source" && input.value === "blob") await prepareBlobUrls();
        record("settings", `${name}=${input.value}`);
      });
    }
  }
  $("speed").value = settings.speed;
  $("speed").addEventListener("change", () => {
    settings.speed = $("speed").value;
    saveJson(SETTINGS_KEY, settings);
    for (const el of elements) {
      el.defaultPlaybackRate = Number(settings.speed);
      el.playbackRate = Number(settings.speed);
    }
    record("settings", `speed=${settings.speed}`);
  });
  for (const id of ["mediaSession", "audioSession", "repeatOne"]) {
    $(id).checked = settings[id];
    $(id).addEventListener("change", () => {
      settings[id] = $(id).checked;
      saveJson(SETTINGS_KEY, settings);
      if (id === "mediaSession") setupMediaSessionHandlers();
      if (id === "audioSession") applyAudioSession();
      record("settings", `${id}=${settings[id]}`);
    });
  }
}

$("playPause").addEventListener("click", () => {
  const el = activeEl();
  if (!trackOf.has(el)) {
    startTrack(state.index);
  } else if (el.paused) {
    el.play().catch((err) => record("play-rejected", `${err.name}: ${err.message}`));
  } else {
    el.pause();
  }
});
$("prev").addEventListener("click", () => skip(-1));
$("next").addEventListener("click", () => skip(1));

function reportText() {
  return [
    `Report ${new Date().toISOString()}`,
    `Version ${BUILD}`,
    $("env").textContent,
    `Settings: ${JSON.stringify(settings)}`,
    $("summary").textContent,
    "",
    ...log.map(formatEntry),
  ].join("\n");
}

$("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(reportText());
    $("copy").textContent = "Copied";
  } catch {
    // Clipboard blocked: show the report in a prompt so it can be copied by hand.
    window.prompt("Copy the report:", reportText());
  }
});

$("clear").addEventListener("click", () => {
  log = [];
  saveJson(LOG_KEY, log);
  $("log").replaceChildren();
  renderSummary();
});

// ---- Lifecycle ---------------------------------------------------------------

document.addEventListener("visibilitychange", () => {
  record("visibility", document.visibilityState);
  if (document.visibilityState === "visible") checkStalePending();
});
window.addEventListener("pagehide", (e) => record("pagehide", `persisted ${e.persisted}`));
window.addEventListener("pageshow", (e) => record("pageshow", `persisted ${e.persisted}`));
document.addEventListener("freeze", () => record("freeze"));
document.addEventListener("resume", () => record("resume"));

async function init() {
  $("version").textContent = `Version ${BUILD}`;
  for (const e of log) renderEntry(e);
  renderSummary();
  bindSettings();
  setupMediaSessionHandlers();
  applyAudioSession();
  renderNowPlaying();
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("sw.js");
    } catch (err) {
      record("sw-failed", String(err));
    }
    navigator.serviceWorker.addEventListener("controllerchange", renderEnv);
  }
  renderEnv();
  await updateCacheStatus();
  if (settings.source === "blob") await prepareBlobUrls();
  record("loaded", `${standalone ? "standalone" : "browser"} ${BUILD}`);
}

init();
