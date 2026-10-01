"use strict";

const TRACKS = [1, 2, 3, 4, 5].map((n) => ({
  path: `audio/song${n}-alto.mp3`,
  title: `Song ${n}`,
  artist: "Pandora Chorus · Alto",
}));
const BUILD = window.BUILD ?? "dev";
const Player = window.Capacitor?.Plugins?.QueuePlayer;
const $ = (id) => document.getElementById(id);

let entries = [];
let loaded = false;
let playing = false;

function formatEntry(e) {
  const time = new Date(e.t).toISOString().slice(11, 23);
  const flags = [
    e.locked ? "locked" : "unlocked",
    e.screenOn === undefined ? null : e.screenOn ? "screen on" : "screen off",
    e.app,
  ].filter(Boolean);
  return `${time} ${e.ev} T${e.track} [${flags.join(", ")}]${e.detail ? " " + e.detail : ""}`;
}

function render() {
  const transitions = entries.filter((e) => e.ev === "transition");
  const count = (locked, ok) => transitions.filter((e) => e.lockedAtEnd === locked && e.ok === ok).length;
  const lockedFail = count(true, false);
  const summary = $("summary");
  summary.textContent =
    `While locked: ${count(true, true)} ok, ${lockedFail} failed. ` +
    `While unlocked: ${count(false, true)} ok, ${count(false, false)} failed.`;
  summary.className = lockedFail ? "bad" : count(true, true) ? "ok" : "";
  $("log").replaceChildren(
    ...entries
      .slice()
      .reverse()
      .map((e) => {
        const li = document.createElement("li");
        li.textContent = formatEntry(e);
        if (e.locked) li.className = "hidden-vis";
        return li;
      }),
  );
}

async function refresh() {
  const { entries: list } = await Player.getLog();
  entries = list;
  const state = await Player.getState();
  playing = state.playing;
  $("playPause").textContent = playing ? "Pause" : "Play";
  $("nowPlaying").textContent = loaded ? `${playing ? "Playing" : "Paused"}: ${TRACKS[state.index].title}` : "Stopped";
  render();
}

async function ensureLoaded() {
  if (loaded) return;
  await Player.load({ tracks: TRACKS, rate: Number($("speed").value) });
  loaded = true;
}

$("playPause").addEventListener("click", async () => {
  await ensureLoaded();
  await (playing ? Player.pause() : Player.play());
  await refresh();
});
$("next").addEventListener("click", async () => {
  await ensureLoaded();
  await Player.next();
  await refresh();
});
$("prev").addEventListener("click", async () => {
  await ensureLoaded();
  await Player.previous();
  await refresh();
});
$("speed").addEventListener("change", () => Player.setRate({ rate: Number($("speed").value) }));
$("refresh").addEventListener("click", refresh);
$("clear").addEventListener("click", async () => {
  await Player.clearLog();
  await refresh();
});

function reportText() {
  return [
    `Native report ${new Date().toISOString()}`,
    `Version ${BUILD}`,
    $("env").textContent,
    `Speed ${$("speed").value}`,
    $("summary").textContent,
    "",
    ...entries.map(formatEntry),
  ].join("\n");
}

$("copy").addEventListener("click", async () => {
  await refresh();
  try {
    await navigator.clipboard.writeText(reportText());
    $("copy").textContent = "Copied";
  } catch {
    window.prompt("Copy the report:", reportText());
  }
});

// The web view may be paused while locked, so catch up from the native log
// whenever the app comes back.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refresh();
});

$("version").textContent = `Version ${BUILD}`;
$("env").textContent = `${window.Capacitor?.getPlatform?.() ?? "web"} · ${navigator.userAgent}`;
if (Player) {
  Player.addListener("event", (e) => {
    entries.push(e);
    render();
  });
  refresh();
} else {
  $("summary").textContent = "QueuePlayer plugin not available (run inside the native app).";
}
