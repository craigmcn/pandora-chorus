const SHELL_CACHE = "spike-shell-v1";
const AUDIO_CACHE = "spike-audio-v1";
const SHELL = ["./", "index.html", "app.js", "style.css", "manifest.webmanifest", "icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.includes("/audio/")) {
    // "?net" is the page's Network source mode: let the browser fetch directly.
    if (url.searchParams.has("net")) return;
    event.respondWith(audioResponse(event));
    return;
  }

  // Network-first so redeploys of the spike show up; cache only for offline use.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(SHELL_CACHE).then((c) => c.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request)),
  );
});

async function audioResponse(event) {
  const cache = await caches.open(AUDIO_CACHE);
  const key = new URL(event.request.url).pathname;
  const cached = await cache.match(key);
  if (cached) return withRange(event.request, cached);

  // Cache-what's-played: fetch the whole file in the background, since the
  // browser's own request is usually a Range request whose 206 can't be cached.
  event.waitUntil(cache.add(key).catch(() => {}));
  return fetch(event.request);
}

// iOS Safari always asks for audio with Range headers and refuses to play a
// plain 200 from a service worker, so cached audio must be sliced into a 206.
async function withRange(request, response) {
  const range = request.headers.get("range");
  if (!range) return response;
  const buf = await response.arrayBuffer();
  const size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let start = m && m[1] ? Number(m[1]) : 0;
  let end = m && m[2] ? Number(m[2]) : size - 1;
  if (m && !m[1] && m[2]) {
    start = size - Number(m[2]);
    end = size - 1;
  }
  end = Math.min(end, size - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "audio/mp4",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}
