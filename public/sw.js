// Zero State service worker.
//  - Page (navigation): network first, so every launch picks up the latest
//    deploy; falls back to the cached copy when offline or the network is slow.
//  - /assets/*: hashed, immutable files → cache first.
//  - Google Fonts: stale-while-revalidate.
//  - Everything else (Supabase API, etc.) is never intercepted.

const SHELL = 'zs-shell-v4';
const ASSETS = 'zs-assets-v1';
const FONTS = 'zs-fonts-v1';
const KEEP = [SHELL, ASSETS, FONTS];
const PRECACHE = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];
const NAV_TIMEOUT_MS = 3500;
const MAX_ASSETS = 40;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

async function networkFirstPage(request) {
  const cache = await caches.open(SHELL);
  const network = fetch(request).then((res) => {
    if (res.ok) cache.put('/', res.clone());
    return res;
  });
  network.catch(() => {}); // a late failure after the timeout is not an error
  const timeout = new Promise((resolve) => setTimeout(resolve, NAV_TIMEOUT_MS));
  try {
    const res = await Promise.race([network, timeout]);
    if (res) return res;
  } catch {
    // offline: fall through to the cache
  }
  return (await cache.match('/')) || network;
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) {
    await cache.put(request, res.clone());
    trim(ASSETS, MAX_ASSETS);
  }
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(FONTS);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(networkFirstPage(request));
  } else if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request));
  }
});
