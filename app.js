const app = document.querySelector('#app');

function openGame(id) {
  const games = { safari: safariGame, lagoon: lagoonGame, prism: prismGame, pico: picoGame };
  (games[id] || home)();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
