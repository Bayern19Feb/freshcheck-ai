// FreshCheck AI service worker.
// - App files are pre-cached so the app opens offline.
// - The model and model card use "network first": the newest version is used
//   when online, and the cached copy when offline.
// Bump CACHE_VERSION whenever app files change.

const CACHE_VERSION = 'freshcheck-v0.4.0';
const APP_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'fonts/plus-jakarta-sans-latin.woff2',
  'img/logo.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'vendor/tf.min.js',
  'vendor/teachablemachine-image.min.js',
  'js/main.js', 'js/ui.js', 'js/state.js', 'js/config.js', 'js/prefs.js', 'js/db.js',
  'js/fruits.js', 'js/fruit-data.js', 'js/interpret.js', 'js/guidance.js', 'js/stats.js', 'js/quiz.js',
  'js/history.js', 'js/evaluation.js', 'js/image.js', 'js/camera.js', 'js/model.js',
  'js/views/home.js', 'js/views/scan.js', 'js/views/result-card.js', 'js/views/history.js',
  'js/views/learn.js', 'js/views/quiz.js', 'js/views/dashboard.js', 'js/views/fruits.js',
  'js/views/model-info.js', 'js/views/settings.js', 'js/views/evaluate.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isNetworkFirst(url) {
  return url.pathname.includes('/models/') || url.pathname.includes('/config/')
    || url.hostname.endsWith('teachablemachine.withgoogle.com') || url.hostname === 'storage.googleapis.com';
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (isNetworkFirst(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || Promise.reject(new Error('offline and not cached')))),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
      }
      return res;
    })),
  );
});
