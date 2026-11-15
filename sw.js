/* PeakNote service worker — precache del "app shell" y funcionamiento sin conexión.
 * Sube VERSION cuando cambies archivos; `npm run sw` regenera la lista PRECACHE. */
const VERSION = '1.0.0';
const CACHE = `peaknote-${VERSION}`;

// <PRECACHE>
const PRECACHE = [
  "./",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon-32.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/owl-book.webp",
  "./assets/owl-folder.webp",
  "./assets/owl-hero.webp",
  "./assets/owl-login.webp",
  "./assets/owl-sleep.webp",
  "./assets/title-cuenta.webp",
  "./assets/title-peaknote.webp",
  "./assets/title-presenta.webp",
  "./index.html",
  "./manifest.webmanifest",
  "./src/components/literal.js",
  "./src/components/shell.js",
  "./src/components/student-forms.js",
  "./src/core/backup-io.js",
  "./src/core/backup-schema.js",
  "./src/core/crypto.js",
  "./src/core/db.js",
  "./src/core/dom.js",
  "./src/core/domain.js",
  "./src/core/importers.js",
  "./src/core/pwa.js",
  "./src/core/router.js",
  "./src/core/session.js",
  "./src/main.js",
  "./src/screens/attendance.js",
  "./src/screens/documents.js",
  "./src/screens/evaluation.js",
  "./src/screens/grade-wizard.js",
  "./src/screens/home.js",
  "./src/screens/login.js",
  "./src/screens/profile.js",
  "./src/screens/settings.js",
  "./src/screens/setup-students.js",
  "./src/screens/students.js",
  "./src/screens/welcome.js",
  "./src/styles/base.css",
  "./src/styles/components.css",
  "./src/styles/screens.css",
  "./src/styles/tokens.css"
];
// </PRECACHE>

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('peaknote-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegación: siempre el shell (la app usa rutas por hash).
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./index.html').then((hit) => hit ?? fetch(req)));
    return;
  }
  // Estáticos: caché primero, red de respaldo (y se guarda).
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (hit) =>
        hit ??
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
