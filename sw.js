const CACHE = 'family-board-v6';
const HOME = new URL('index.html', self.registration.scope).href;
const ASSETS = [
  'index.html', 'styles.css', 'launcher.css', 'app.js', 'catalog.js',
  'launcher.js', 'manifest.webmanifest', 'slingshot.jpg',
  'covers/BalloonMaze.jpg',
  'covers/BalloonPop.jpg',
  'covers/ColoringForKids.jpg',
  'covers/FindTheOddOneOut.jpg',
  'covers/JigsawJamAnimal.jpg',
  'covers/JigsawJamCars.jpg',
  'covers/LumaBubbles.jpg',
  'covers/MemoryPuzzle.jpg',
  'covers/PlushyAnimals.jpg',
  'covers/ZooAnimals.jpg',
].map(path => new URL(path, self.registration.scope).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('family-board-') && name !== CACHE)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (request.mode === 'navigate' && (url.href.split(/[?#]/)[0] === self.registration.scope || url.href.split(/[?#]/)[0] === HOME)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(HOME)).then(hit => hit || fetch(request)));
  } else if (ASSETS.includes(request.url)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(request)).then(hit => hit || fetch(request)));
  }
});
