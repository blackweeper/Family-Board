const safariAnimals = [
  ['🐼', 'Panda', 'panda'],
  ['🦊', 'Renard', 'fox'],
  ['🐸', 'Grenouille', 'frog'],
  ['🦁', 'Lion', 'lion'],
  ['🐘', 'Éléphant', 'elephant'],
  ['🦓', 'Zèbre', 'zebra'],
  ['🦒', 'Girafe', 'giraffe'],
  ['🦛', 'Hippopotame', 'hippo', 'Hippo'],
  ['🐦', 'Toucan', 'toucan'],
  ['🐵', 'Singe', 'monkey'],
  ['🐢', 'Tortue', 'turtle'],
  ['🦏', 'Rhinocéros', 'rhino', 'Rhino'],
];
const safariPace = {
  little: { wait: 820, variation: 520, react: 1950, result: 660 },
  family: { wait: 510, variation: 430, react: 1180, result: 560 },
};
const safariRules = `
  <h2>Comment jouer ?</h2>
  <ol>
    <li>Choisis ton animal et place-toi devant sa zone colorée.</li>
    <li>À chaque manche, les cartes se tournent vers un autre joueur. Regarde l’animal visible et attends que la deuxième carte se retourne.</li>
    <li>Deux animaux identiques ? Tape ta zone le plus vite possible. En mode Famille, la carte ⚡ invite tout le monde à taper.</li>
    <li>Si tu tapes trop tôt ou sur deux animaux différents, tu perds une étoile (minimum zéro) et ta zone se bloque pour ce tour.</li>
    <li>Le premier bon réflexe rapporte une étoile. Avec cinq étoiles, tu gagnes !</li>
  </ol>`;

function safariPortrait(animal) {
  return animal[2] ? `<img src="./covers/safari-${animal[2]}.jpg" alt="" draggable="false">` : animal[0];
}

function safariGame() {
  let playerCount = 4;
  let selectedSeat = 0;
  const players = safariAnimals.slice(0, 4);
  let mode = 'little';
  let soundOn = true;
  let scores = [];
  let blocked = new Set();
  let phase = 'setup';
  let target, card, matches;
  let deck = [];
  let round = 0;
  const rotations = [0, -90, 180, 90];
  let timer;
  let audio;
  let musicTimer;
  let musicBus;
  let beat = 0;
  const pick = items => items[Math.floor(Math.random() * items.length)];

  app.innerHTML = `
    <section class="safari">
      <div class="safari-bar">
        <button class="secondary" id="back">← Jeux</button>
        <button class="secondary" id="safari-sound" aria-pressed="true">🔊 Son</button>
        <button class="secondary" id="safari-rules">? Règles</button>
      </div>
      <div id="safari-stage"></div>
      <dialog class="safari-rules" aria-labelledby="safari-rules-title">
        <div id="safari-rules-title">${safariRules}</div>
        <form method="dialog"><button class="primary">Compris !</button></form>
      </dialog>
    </section>`;
  const stage = app.querySelector('#safari-stage');
  const rules = app.querySelector('dialog');

  function note(frequency, delay, volume, duration, type = 'sine', destination = audio?.destination) {
    if (!soundOn || audio?.state !== 'running' || !destination) return;
    const start = audio.currentTime + delay;
    const oscillator = audio.createOscillator();
    const envelope = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(.001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + .015);
    envelope.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(envelope).connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  function stopMusic() {
    clearInterval(musicTimer);
    musicTimer = undefined;
    musicBus?.disconnect();
    musicBus = undefined;
  }

  function playKalimba(pitch, volume) {
    note(pitch, 0, volume, .46, 'sine', musicBus);
    note(pitch * 2.01, 0, volume * .23, .16, 'sine', musicBus);
    note(pitch * 3.97, 0, volume * .08, .07, 'sine', musicBus);
  }

  function startMusic() {
    if (!soundOn || !window.AudioContext || musicTimer !== undefined) return;
    audio ??= new AudioContext();
    audio.resume().catch(() => {});
    musicBus = audio.createGain();
    musicBus.connect(audio.destination);
    musicBus.gain.value = .65;
    const melody = [
      329.63, 0, 440, 523.25, 0, 392, 0, 0,
      349.23, 0, 440, 0, 523.25, 0, 659.25, 0,
      293.66, 0, 392, 440, 0, 523.25, 0, 0,
      329.63, 0, 392, 0, 440, 0, 0, 0,
    ];
    const bass = [110, 87.31, 98, 82.41];
    musicTimer = setInterval(() => {
      const step = beat % melody.length;
      if (melody[step]) playKalimba(melody[step], .065);
      if (step % 8 === 0) note(bass[step / 8], 0, .038, .55, 'sine', musicBus);
      if (step % 8 === 3 || step % 8 === 6) note(142, 0, .023, .10, 'sine', musicBus);
      beat++;
    }, 325);
  }

  function effect(kind) {
    const notes = { reveal: [330, 440], miss: [233, 165], point: [523, 659, 784], win: [523, 659, 784, 1047] };
    notes[kind].forEach((pitch, index) => {
      note(pitch, index * .085, .09, kind === 'win' ? .32 : .16, 'triangle');
    });
  }

  function schedule(callback, delay) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (stage.isConnected && !rules.open) callback();
    }, delay);
  }

  function setup() {
    phase = 'setup';
    stage.innerHTML = `
      <div class="safari-intro safari-lobby">
        <div class="safari-config">
          <h1>Boum Safari</h1>
          <p>Deux animaux identiques ? Tape !</p>
          <fieldset><legend>Joueurs</legend><div class="safari-choices">
            ${[2,3,4].map(count => `<button data-count="${count}" aria-pressed="${playerCount === count}">${count}</button>`).join('')}
          </div></fieldset>
          <fieldset><legend>Mode</legend><div class="safari-choices">
            <button data-mode="little" aria-pressed="${mode === 'little'}">🐾 Petits</button>
            <button data-mode="family" aria-pressed="${mode === 'family'}">⚡ Famille</button>
          </div></fieldset>
          <button class="safari-start" data-start>▶ Jouer</button>
        </div>
        <section class="safari-selection" aria-labelledby="safari-selection-title">
          <h2 id="safari-selection-title">Choisissez vos animaux</h2>
          <p>Touche un joueur, puis son animal. Deux joueurs peuvent échanger leurs animaux.</p>
          <div class="safari-pickers" aria-label="Joueurs">
            ${players.slice(0, playerCount).map((animal, index) => `
              <button class="safari-picker safari-seat-color-${index}" data-select-seat="${index}"
                aria-label="Joueur ${index + 1} · ${animal[1]}" aria-pressed="${index === selectedSeat}">
                <span class="safari-picker-portrait">${safariPortrait(animal)}</span>
                <span>Joueur ${index + 1}</span>
              </button>`).join('')}
          </div>
          <div class="safari-pickers safari-animal-options" aria-label="Animaux pour le joueur ${selectedSeat + 1}">
            ${safariAnimals.map((animal, index) => `
              <button class="safari-picker" data-animal="${index}" aria-label="${animal[1]}" aria-pressed="${players[selectedSeat] === animal}">
                <span class="safari-picker-portrait">${safariPortrait(animal)}</span>
                <span>${animal[3] || animal[1]}</span>
              </button>`).join('')}
          </div>
        </section>
      </div>`;
  }

  function begin() {
    beat = 0;
    startMusic();
    scores = Array(playerCount).fill(0);
    deck = [];
    round = 0;
    nextRound();
  }

  function nextRound() {
    blocked = new Set();
    phase = 'ready';
    const pace = safariPace[mode];
    if (!deck.length) deck = [...safariAnimals];
    target = pick(deck.filter(animal => animal !== target));
    deck.splice(deck.indexOf(target), 1);
    const surprise = mode === 'family' && Math.random() < .12;
    card = surprise ? ['⚡','Éclair'] : Math.random() < .56 ? target : pick(safariAnimals.filter(animal => animal !== target));
    matches = surprise || target === card;
    draw('Attends…');
    schedule(() => {
      phase = 'reveal';
      effect('reveal');
      draw(card[0] === '⚡' ? '⚡' : 'À toi de regarder !');
      schedule(() => endRound(blocked.size === playerCount ? 'Tour suivant' : matches ? 'Bien essayé !' : 'Bien vu !'), pace.react);
    }, pace.wait + Math.random() * pace.variation);
  }

  function stars(score, earned = false) {
    return Array.from({ length: 5 }, (_, index) => {
      const filled = index < score ? ' is-filled' : '';
      const pop = earned && index === score - 1 ? ' is-earned' : '';
      return `<span class="safari-star${filled}${pop}"></span>`;
    }).join('');
  }

  function seatLabel(index) {
    const score = scores[index];
    return `${players[index][1]}, ${score} ${score === 1 ? 'étoile' : 'étoiles'}${blocked.has(index) ? ', en pause pour ce tour' : ''}`;
  }

  function draw(message, scorer = -1) {
    const facing = round % playerCount;
    const previous = (round - 1) % playerCount;
    const angle = playerCount === 2 && facing === 1 ? 180 : rotations[facing];
    const previousAngle = playerCount === 2 && previous === 1 ? 180 : rotations[previous];
    const startAngle = round ? angle + (previousAngle - angle + 540) % 360 - 180 : angle;
    stage.innerHTML = `
      <div class="safari-table seats-${playerCount}" data-phase="${phase}">
        <div class="safari-center">
          <div class="safari-cards" data-facing="${facing + 1}" style="--facing:${angle}deg;--from:${startAngle}deg">
            <div class="safari-card" aria-label="${target[1]}">${safariPortrait(target)}</div>
            <div class="safari-card ${phase === 'ready' ? 'face-down' : ''}" aria-label="${phase === 'ready' ? 'Carte cachée' : card[1]}">${phase === 'ready' ? '✦' : safariPortrait(card)}</div>
          </div>
          <p class="safari-status" role="status">${message}</p>
        </div>
        ${scores.map((score, index) => `
          <button class="safari-seat seat-${index} ${blocked.has(index) ? 'seat-blocked' : ''}" data-seat="${index}"
            aria-label="${seatLabel(index)}">
            <span class="safari-mascot">${safariPortrait(players[index])}</span>
            <span class="safari-stars" aria-hidden="true">${stars(score, scorer === index)}</span>
          </button>`).join('')}
      </div>`;
  }

  function endRound(message, scorer = -1) {
    phase = 'result';
    draw(message, scorer);
    schedule(() => {
      round++;
      nextRound();
    }, safariPace[mode].result);
  }

  function react(index, button) {
    if ((phase !== 'ready' && phase !== 'reveal') || blocked.has(index)) return;
    if (phase === 'ready' || !matches) {
      blocked.add(index);
      scores[index] = Math.max(0, scores[index] - 1);
      effect('miss');
      button.classList.add('seat-blocked');
      button.querySelector('.safari-stars').innerHTML = stars(scores[index]);
      button.setAttribute('aria-label', seatLabel(index));
      if (blocked.size === playerCount && phase === 'reveal') endRound('Tour suivant');
      return;
    }
    scores[index]++;
    const winner = players[index];
    if (scores[index] < 5) {
      effect('point');
      endRound('Une étoile gagnée !', index);
      return;
    }
    clearTimeout(timer);
    phase = 'finished';
    stopMusic();
    effect('win');
    stage.innerHTML = `
      <div class="safari-victory">
        <span class="safari-winner" aria-hidden="true">${safariPortrait(winner)}</span>
        <h1>${winner[1]} gagne !</h1>
        <p class="safari-stars" aria-label="Cinq étoiles">${stars(5, true)}</p>
        <button class="safari-start" data-start>↻ Rejouer</button>
        <button class="secondary" data-setup>Changer les joueurs</button>
      </div>`;
    stage.querySelector('[data-start]').focus();
  }

  stage.addEventListener('pointerdown', event => {
    const button = event.target.closest('[data-seat]');
    if (!button || event.button !== 0) return;
    event.preventDefault();
    react(Number(button.dataset.seat), button);
  });

  stage.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-seat') && event.detail === 0) react(Number(button.dataset.seat), button);
    if (button.hasAttribute('data-start')) begin();
    if (button.hasAttribute('data-setup')) setup();
    if (button.hasAttribute('data-select-seat')) {
      selectedSeat = Number(button.dataset.selectSeat);
      setup();
      stage.querySelector(`[data-select-seat="${selectedSeat}"]`).focus({ preventScroll: true });
    }
    if (button.hasAttribute('data-animal')) {
      const animal = safariAnimals[Number(button.dataset.animal)];
      const previousSeat = players.indexOf(animal);
      if (previousSeat !== -1) players[previousSeat] = players[selectedSeat];
      players[selectedSeat] = animal;
      setup();
      stage.querySelector(`[data-animal="${button.dataset.animal}"]`).focus({ preventScroll: true });
    }
    if (button.dataset.count || button.dataset.mode) {
      if (button.dataset.count) {
        playerCount = Number(button.dataset.count);
        selectedSeat = Math.min(selectedSeat, playerCount - 1);
      }
      if (button.dataset.mode) mode = button.dataset.mode;
      setup();
      stage.querySelector(button.dataset.count ? `[data-count="${playerCount}"]` : `[data-mode="${mode}"]`).focus();
    }
  });

  app.querySelector('#safari-rules').onclick = () => {
    clearTimeout(timer);
    stopMusic();
    rules.showModal();
  };
  rules.addEventListener('close', () => {
    if (stage.isConnected && ['ready','reveal','result'].includes(phase)) {
      startMusic();
      nextRound();
    }
  });
  app.querySelector('#safari-sound').onclick = event => {
    soundOn = !soundOn;
    if (!soundOn) stopMusic();
    else if (['ready','reveal','result'].includes(phase)) startMusic();
    event.currentTarget.setAttribute('aria-pressed', soundOn);
    event.currentTarget.textContent = soundOn ? '🔊 Son' : '🔇 Son';
  };
  app.querySelector('#back').onclick = () => {
    clearTimeout(timer);
    stopMusic();
    audio?.close().catch(() => {});
    home('[data-detail="safari"]');
  };
  setup();
}
