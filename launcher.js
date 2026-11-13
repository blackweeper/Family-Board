const sourceLabels = { home: 'Jeux maison', web: 'Jeux Web', ipad: 'Apps iPad' };
const favoriteKey = 'family-board-favorites';
let favorites = new Set();
try {
  const saved = JSON.parse(localStorage.getItem(favoriteKey));
  if (Array.isArray(saved)) favorites = new Set(saved);
} catch {}

const featured = catalog[0];
const filters = { all: 'Tout', ...sourceLabels, favorites: 'Favoris' };
let shelf = 'all';
let category = '';
let detailReturnFocus = '';
const details = document.querySelector('#details');
const isFavorite = game => favorites.has(game.id);

function toggleFavorite(game) {
  if (isFavorite(game)) favorites.delete(game.id);
  else favorites.add(game.id);
  try { localStorage.setItem(favoriteKey, JSON.stringify([...favorites])); } catch {}
}

function favoriteButton(game) {
  return `<button class="star" type="button" data-star="${game.id}" aria-label="Favori · ${game.title}" aria-pressed="${isFavorite(game)}">${isFavorite(game) ? '★' : '☆'}</button>`;
}

function coverLink(game) {
  const art = game.artwork || (game.provider ? `./covers/${game.provider}.jpg` : '');
  const content = `
    <span class="cover-art" aria-hidden="true">${art ? `<img src="${art}" alt="" loading="lazy">` : game.icon}</span>
    ${art ? `<span class="cover-play" aria-hidden="true">${game.artwork ? '↗' : '▶'}</span>` : ''}
    <span class="cover-copy"><small>${game.artwork ? 'itch.io · Sans pub' : `${sourceLabels[game.type]} · ${game.category}`}</small><strong>${game.title}</strong></span>`;
  if (game.artwork) return `<a class="cover-open" href="${game.url}" target="_blank" rel="noopener noreferrer">${content}</a>`;
  return `<button class="cover-open" ${game.provider ? 'data-arcade' : 'data-detail'}="${game.id}">${content}</button>`;
}

function home(focusSelector) {
  const games = catalog.filter(game =>
    (shelf === 'all' || (shelf === 'favorites' ? isFavorite(game) : game.type === shelf)) &&
    (!category || game.category === category));
  const categories = [...new Set(catalog.map(game => game.category))];
  app.innerHTML = `
    ${shelf === 'all' && !category ? `<section class="spotlight" aria-labelledby="feature-title">
      <div class="spotlight-copy">
        <span class="eyebrow">À la une</span>
        <h1 id="feature-title">Family<br>Slingshot</h1>
        <p>À toi de faire tomber la forteresse !</p>
        <button class="primary launch-button" data-detail="${featured.id}">▶ Découvrir le jeu</button>
      </div>
    </section>` : ''}
    <section class="library" aria-labelledby="library-title">
      <div class="library-head">
        <h2 id="library-title">${filters[shelf] === 'Tout' ? 'Tous les jeux' : filters[shelf]}</h2>
        <label>Catégorie
          <select id="category">
            <option value="">Toutes</option>
            ${categories.map(name => `<option ${category === name ? 'selected' : ''}>${name}</option>`).join('')}
          </select>
        </label>
      </div>
      <nav class="shelves" aria-label="Collections">
        ${Object.entries(filters).map(([id, label]) =>
          `<button data-shelf="${id}" aria-pressed="${id === shelf}">${id === 'favorites' ? '★ ' : ''}${label}</button>`).join('')}
      </nav>
      <div class="covers">${games.map(game => `
        <article class="cover ${game.color}">
          ${coverLink(game)}
          ${favoriteButton(game)}
        </article>`).join('')}</div>
      ${games.length ? '' : `<p class="empty">${shelf === 'favorites' && !category ? 'Touche l’étoile d’un jeu pour l’ajouter ici.' : 'Aucun jeu dans cette catégorie.'}</p>`}
    </section>`;
  if (focusSelector) app.querySelector(focusSelector)?.focus({ preventScroll: true });
}

function showDetails(game) {
  detailReturnFocus = '';
  details.dataset.game = game.id;
  details.innerHTML = `
    <div class="detail-art ${game.color}" aria-hidden="true">${game.icon}</div>
    <form method="dialog"><button class="close-detail" aria-label="Fermer" autofocus>×</button></form>
    <div class="detail-copy">
      <p class="eyebrow">${sourceLabels[game.type]} · ${game.category}</p>
      <h2 id="detail-title">${game.title}</h2>
      <p>${game.description}</p>
      <p class="detail-meta">${game.players} · ${game.type === 'home' ? 'Hors ligne après le premier chargement' : game.type === 'web' ? 'Internet requis · Site externe' : game.purchase}</p>
      ${game.type === 'ipad' ? '<p class="detail-meta">Une fois le jeu installé, ouvre-le depuis l’App Store ou l’écran d’accueil de l’iPad.</p>' : ''}
      ${game.id === 'safari' ? `<details><summary>📖 Règles du jeu</summary>${safariRules}</details>` : ''}
      <div class="detail-actions">
        ${game.type === 'home' ? '<button class="primary launch-button" data-play>▶ Jouer</button>' :
          `<a class="primary launch-button" href="${game.url}" target="_blank" rel="noopener noreferrer">${game.type === 'web' ? 'Jouer sur le Web' : 'Voir dans l’App Store'} ↗</a>`}
        ${favoriteButton(game)}
      </div>
    </div>`;
  details.showModal();
}

app.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.shelf) {
    shelf = button.dataset.shelf;
    category = '';
    home(`[data-shelf="${shelf}"]`);
  } else if (button.dataset.arcade) {
    openArcade(catalog.find(game => game.id === button.dataset.arcade));
  } else if (button.dataset.detail) {
    showDetails(catalog.find(game => game.id === button.dataset.detail));
  } else if (button.dataset.star) {
    const game = catalog.find(item => item.id === button.dataset.star);
    toggleFavorite(game);
    home(shelf === 'favorites' && !isFavorite(game) ? '[data-shelf="favorites"]' : `[data-star="${game.id}"]`);
  }
});

app.addEventListener('change', event => {
  if (event.target.id !== 'category') return;
  category = event.target.value;
  home('#category');
});

details.addEventListener('click', event => {
  const game = catalog.find(item => item.id === details.dataset.game);
  if (event.target === details) details.close();
  if (event.target.closest('[data-star]')) {
    toggleFavorite(game);
    const star = details.querySelector('[data-star]');
    star.textContent = isFavorite(game) ? '★' : '☆';
    star.setAttribute('aria-pressed', isFavorite(game));
    detailReturnFocus = shelf === 'favorites' && !isFavorite(game) ? '[data-shelf="favorites"]' : `.cover [data-detail="${game.id}"]`;
    home();
  }
  if (event.target.closest('[data-play]')) {
    details.close();
    openGame(game.id);
    window.scrollTo(0, 0);
    app.querySelector('#back').focus({ preventScroll: true });
  }
});

details.addEventListener('close', () => {
  if (detailReturnFocus) app.querySelector(detailReturnFocus)?.focus({ preventScroll: true });
});

function openArcade(game) {
  const gameUrl = `https://cdn.htmlgames.com/${game.provider}/index.html?lang=fr`;
  app.innerHTML = `
    <section class="arcade" aria-labelledby="arcade-title">
      <div class="arcade-bar">
        <button type="button" class="secondary" id="back">← Retour aux jeux</button>
        <h1 id="arcade-title">${game.title}</h1>
      </div>
      ${navigator.onLine ?
        `<iframe class="arcade-game" src="${gameUrl}" title="${game.title}" allow="autoplay; fullscreen" allowfullscreen></iframe>` :
        '<p class="empty" role="status">Ce jeu a besoin d’Internet. Reviens au catalogue pour jouer hors ligne.</p>'}
      <div class="arcade-help">
        <details>
          <summary>Écran noir ?</summary>
          <p>Relance le lecteur. Si l’écran reste noir, ouvre le jeu dans le navigateur.</p>
          <button type="button" class="secondary" id="retry-arcade">↻ Relancer</button>
          <a class="secondary" href="${gameUrl}" target="_blank" rel="noopener noreferrer">Ouvrir dans le navigateur ↗</a>
        </details>
      </div>
      <p class="arcade-credit">${game.description} · ${game.players} (repère) · HTMLGames / Zygomatic · Publicités possibles</p>
    </section>`;
  app.querySelector('#retry-arcade').onclick = () => openArcade(game);
  app.querySelector('#back').onclick = () => home(`[data-arcade="${game.id}"]`);
  window.scrollTo(0, 0);
  app.querySelector('#back').focus({ preventScroll: true });
}

home();
