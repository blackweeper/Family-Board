const favoriteKey = 'family-board-favorites';
let favorites = new Set();
try {
  const saved = JSON.parse(localStorage.getItem(favoriteKey));
  if (Array.isArray(saved)) favorites = new Set(catalog.filter(game => saved.includes(game.id)).map(game => game.id));
} catch {}

let favoritesOnly = false;
let detailReturnFocus = '';
let theater = false;
const details = document.querySelector('#details');
const gameRules = { safari: safariRules, lagoon: lagoonRules, prism: prismRules, pico: picoRules };
const isFavorite = game => favorites.has(game.id);

function toggleFavorite(game) {
  if (isFavorite(game)) favorites.delete(game.id);
  else favorites.add(game.id);
  try { localStorage.setItem(favoriteKey, JSON.stringify([...favorites])); } catch {}
}

function favoriteButton(game) {
  return `<button class="star" type="button" data-star="${game.id}" aria-label="Favori · ${game.title}" aria-pressed="${isFavorite(game)}">${isFavorite(game) ? '★' : '☆'}</button>`;
}

function updateTheater(active) {
  theater = active;
  document.body.classList.toggle('game-theater', active);
  const button = app.querySelector('[data-fullscreen]');
  if (button) {
    button.textContent = active ? '⤡ Réduire' : '⛶ Plein écran';
    button.setAttribute('aria-pressed', active);
  }
}

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement;
}

async function leaveTheater() {
  updateTheater(false);
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (fullscreenElement() && exit) {
    try { await exit.call(document); } catch {}
  }
}

async function toggleTheater() {
  if (theater) {
    await leaveTheater();
    return;
  }
  updateTheater(true);
  const root = document.documentElement;
  const enter = root.requestFullscreen || root.webkitRequestFullscreen;
  if (enter) {
    try {
      await enter.call(root);
      if (!theater && fullscreenElement()) await leaveTheater();
    } catch {}
  }
}

for (const event of ['fullscreenchange', 'webkitfullscreenchange']) {
  document.addEventListener(event, () => {
    if (!fullscreenElement()) updateTheater(false);
  });
}

function home(focusSelector) {
  if (theater || fullscreenElement()) leaveTheater();
  const games = favoritesOnly ? catalog.filter(isFavorite) : catalog;
  app.innerHTML = `
    <section class="library" aria-labelledby="library-title">
      <h1 id="library-title">Choisis ton jeu</h1>
      <nav class="shelves" aria-label="Collections">
        <button data-shelf="all" aria-pressed="${!favoritesOnly}">Tous les jeux</button>
        <button data-shelf="favorites" aria-pressed="${favoritesOnly}">★ Favoris</button>
      </nav>
      <div class="covers">${games.map(game => `
        <article class="cover ${game.color}">
          <button class="cover-open" data-detail="${game.id}">
            <span class="cover-art" aria-hidden="true"></span>
            <span class="cover-copy"><strong>${game.title}</strong><small>${game.players}</small></span>
          </button>
          ${favoriteButton(game)}
        </article>`).join('')}</div>
      ${games.length ? '' : '<p class="empty">Touche l’étoile d’un jeu pour l’ajouter ici.</p>'}
    </section>`;
  if (focusSelector) app.querySelector(focusSelector)?.focus({ preventScroll: true });
}

function showDetails(game) {
  detailReturnFocus = '';
  details.dataset.game = game.id;
  details.innerHTML = `
    <div class="detail-art ${game.color}" aria-hidden="true"></div>
    <form method="dialog"><button class="close-detail" aria-label="Fermer" autofocus>×</button></form>
    <div class="detail-copy">
      <h2 id="detail-title">${game.title}</h2>
      <p>${game.description}</p>
      <p class="detail-meta">${game.players} · Hors ligne après le premier chargement</p>
      <details><summary>📖 Règles du jeu</summary>${gameRules[game.id]}</details>
      <div class="detail-actions">
        <button class="primary launch-button" data-play>▶ Jouer</button>
        ${favoriteButton(game)}
      </div>
    </div>`;
  details.showModal();
}

app.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-fullscreen')) {
    toggleTheater();
  } else if (button.dataset.shelf) {
    favoritesOnly = button.dataset.shelf === 'favorites';
    home(`[data-shelf="${button.dataset.shelf}"]`);
  } else if (button.dataset.detail) {
    showDetails(catalog.find(game => game.id === button.dataset.detail));
  } else if (button.dataset.star) {
    const game = catalog.find(item => item.id === button.dataset.star);
    toggleFavorite(game);
    home(favoritesOnly && !isFavorite(game) ? '[data-shelf="favorites"]' : `[data-star="${game.id}"]`);
  }
});

details.addEventListener('click', event => {
  const game = catalog.find(item => item.id === details.dataset.game);
  if (event.target === details) details.close();
  if (event.target.closest('[data-star]')) {
    toggleFavorite(game);
    const star = details.querySelector('[data-star]');
    star.textContent = isFavorite(game) ? '★' : '☆';
    star.setAttribute('aria-pressed', isFavorite(game));
    detailReturnFocus = favoritesOnly && !isFavorite(game) ? '[data-shelf="favorites"]' : `[data-detail="${game.id}"]`;
    home();
  }
  if (event.target.closest('[data-play]')) {
    details.close();
    openGame(game.id);
    const back = app.querySelector('#back');
    back.insertAdjacentHTML('afterend', '<button type="button" class="secondary" data-fullscreen aria-pressed="false">⛶ Plein écran</button>');
    window.scrollTo(0, 0);
    back.focus({ preventScroll: true });
  }
});

details.addEventListener('close', () => {
  if (detailReturnFocus) app.querySelector(detailReturnFocus)?.focus({ preventScroll: true });
});

home();
