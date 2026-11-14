const app = document.querySelector('#app');

function openGame(id) {
  const games = { safari: safariGame, lagoon: lagoonGame, prism: prismGame, pico: picoGame, table: tableGame, coop: coopGame, toys: toysGame, athletes: athleteGame, carrot: carrotGame, kiwi: kiwiGame, flip7: flip7Game };
  (games[id] || home)();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
