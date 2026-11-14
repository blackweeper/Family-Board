const CACHE = 'family-board-v44';
const HOME = new URL('index.html', self.registration.scope).href;
const ASSETS = [
  'index.html', 'styles.css', 'launcher.css', 'app.js', 'catalog.js',
  'covers/safari-panda.jpg', 'covers/safari-fox.jpg',
  'covers/safari-frog.jpg', 'covers/safari-lion.jpg',
  'covers/safari-elephant.jpg', 'covers/safari-zebra.jpg',
  'covers/safari-giraffe.jpg', 'covers/safari-hippo.jpg',
  'covers/safari-toucan.jpg', 'covers/safari-monkey.jpg',
  'covers/safari-turtle.jpg', 'covers/safari-rhino.jpg',
  'coop.js', 'coop.css', 'covers/coop.jpg', 'covers/coop-board.jpg',
  'covers/coop-fox.png', 'covers/coop-nest.png', 'covers/coop-egg.png', 'covers/coop-shield.png', 'covers/coop-rail.webp',
  'covers/coop-token-0.jpg', 'covers/coop-token-1.jpg', 'covers/coop-token-2.jpg', 'covers/coop-token-3.jpg',
  'table.js', 'table.css', 'covers/table.jpg', 'covers/table-board.jpg',
  'covers/table-card-0.jpg', 'covers/table-card-1.jpg', 'covers/table-card-2.jpg',
  'pico.js', 'pico.css', 'covers/pico.jpg', 'covers/pico-board.jpg', 'covers/pico-token.png',
  'covers/pico-egg-0.png', 'covers/pico-egg-1.png', 'covers/pico-egg-2.png', 'covers/pico-egg-3.png',
  'covers/pico-otter.png', 'covers/pico-shelter.jpg',
  'prism.js', 'prism.css', 'covers/prism.jpg', 'covers/prism-cover.jpg', 'covers/prism-board.jpg',
  'covers/prism-character-0.png', 'covers/prism-character-1.png', 'covers/prism-character-2.png', 'covers/prism-character-3.png',
  'covers/prism-character-4.png', 'covers/prism-character-5.png', 'covers/prism-character-6.png', 'covers/prism-character-7.png',
  'lagoon.js', 'lagoon.css', 'covers/lagoon.jpg', 'covers/lagoon-board.jpg', 'covers/lagoon-treasures.jpg',
  'covers/lagoon-otter.jpg', 'covers/lagoon-crab.jpg', 'covers/lagoon-octopus.jpg', 'covers/lagoon-turtle.jpg',
  'covers/lagoon-puffin.jpg', 'covers/lagoon-seahorse.jpg',
  'covers/lagoon-axolotl.jpg', 'covers/lagoon-dolphin.jpg',
  'safari.js', 'safari.css', 'covers/safari.jpg', 'covers/safari-board.jpg',
  'toys.js', 'toys.css', 'covers/toys.jpg',
  'covers/toys-castle.jpg', 'covers/toys-jungle.jpg', 'covers/toys-space.jpg', 'covers/toys-pirate.jpg', 'covers/toys-snow.jpg',
  'covers/toys-robot.png', 'covers/toys-dino.png', 'covers/toys-rabbit.png', 'covers/toys-lion.png',
  'covers/toys-raccoon.png', 'covers/toys-fox.png', 'covers/toys-octopus.png', 'covers/toys-bear.png',
  'athletes.js', 'athletes-rules.js', 'athletes.css', 'covers/athletes.jpg',
  'covers/athletes-mild.webp', 'covers/athletes-wild.webp',
  ...Array.from({length:36}, (_, i) => 'covers/athlete-' + i + '.webp'),
  'carrot-rules.js', 'carrot.js', 'carrot.css', 'covers/carrot.jpg',
  'covers/carrot-board.webp', 'covers/carrot-goal.webp', 'covers/carrot-mole.webp',
  'covers/carrot-bridge.webp', 'covers/carrot-gate.webp',
  ...Array.from({ length: 4 }, (_, i) => 'covers/carrot-rabbit-' + i + '.webp'),
  'kiwi-rules.js', 'kiwi.js', 'kiwi.css', 'covers/kiwi.jpg', 'covers/kiwi-table.webp',
  'covers/kiwi-ramp.webp', 'covers/kiwi-plane.webp', 'covers/kiwi-straw.webp',
  ...Array.from({ length: 4 }, (_, i) => 'covers/kiwi-bird-' + i + '.webp'),
  'flip7-rules.js', 'flip7.js', 'flip7.css', 'covers/flip7.jpg', 'covers/flip7-mat.webp',
  'launcher.js', 'manifest.webmanifest',
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
