const safariAnimals = [['🐼','Panda','panda'], ['🦊','Renard','fox'], ['🐸','Grenouille','frog'], ['🦁','Lion','lion']];
const safariRules = `
  <h2>Comment jouer ?</h2>
  <ol>
    <li>Choisis ton animal et place-toi devant sa zone colorée.</li>
    <li>Regarde l’animal à gauche, puis attends que la carte de droite se retourne.</li>
    <li>Deux animaux identiques ? Tape ta zone le plus vite possible. En mode Famille, la carte ⚡ invite tout le monde à taper.</li>
    <li>Si tu tapes trop tôt ou sur deux animaux différents, ta zone se bloque pour ce tour.</li>
    <li>Le premier bon réflexe rapporte une étoile. Avec cinq étoiles, tu gagnes !</li>
  </ol>`;

function safariPortrait(animal) {
  return animal[2] ? `<img src="./covers/safari-${animal[2]}.jpg" alt="" draggable="false">` : animal[0];
}

function safariGame() {
  let playerCount = 4;
  let mode = 'little';
  let soundOn = true;
  let scores = [];
  let blocked = new Set();
  let phase = 'setup';
  let target, card, matches;
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

  function startMusic() {
    if (!soundOn || !window.AudioContext || musicTimer !== undefined) return;
    audio ??= new AudioContext();
    audio.resume().catch(() => {});
    musicBus = audio.createGain();
    musicBus.connect(audio.destination);
    const melody = [392, 440, 523, 0, 587, 523, 440, 0, 349, 392, 440, 0, 523, 440, 392, 0];
    musicTimer = setInterval(() => {
      const pitch = melody[beat % melody.length];
      if (pitch) note(pitch, 0, .035, .31, 'triangle', musicBus);
      if (beat % 4 === 0) note(beat % 16 < 8 ? 130.81 : 110, 0, .045, .28, 'sine', musicBus);
      beat++;
    }, 250);
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
      <div class="safari-intro">
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
      </div>`;
  }

  function begin() {
    beat = 0;
    startMusic();
    scores = Array(playerCount).fill(0);
    nextRound();
  }

  function nextRound() {
    blocked = new Set();
    phase = 'ready';
    const animals = safariAnimals.slice(0, mode === 'little' ? 3 : 5);
    target = pick(animals);
    const surprise = mode === 'family' && Math.random() < .12;
    card = surprise ? ['⚡','Éclair'] : Math.random() < .56 ? target : pick(animals.filter(animal => animal !== target));
    matches = surprise || target === card;
    draw('Attends…');
    schedule(() => {
      phase = 'reveal';
      effect('reveal');
      draw(card[0] === '⚡' ? '⚡' : 'À toi de regarder !');
      schedule(() => endRound(blocked.size === playerCount ? 'Tour suivant' : matches ? 'Bien essayé !' : 'Bien vu !'), mode === 'little' ? 2450 : 1450);
    }, (mode === 'little' ? 1350 : 780) + Math.random() * 800);
  }

  function draw(message) {
    stage.innerHTML = `
      <div class="safari-table seats-${playerCount}" data-phase="${phase}">
        <div class="safari-center">
          <div class="safari-cards">
            <div class="safari-card" aria-label="${target[1]}">${safariPortrait(target)}</div>
            <div class="safari-card ${phase === 'ready' ? 'face-down' : ''}" aria-label="${phase === 'ready' ? 'Carte cachée' : card[1]}">${phase === 'ready' ? '✦' : safariPortrait(card)}</div>
          </div>
          <p class="safari-status" role="status">${message}</p>
        </div>
        ${scores.map((score, index) => `
          <button class="safari-seat seat-${index} ${blocked.has(index) ? 'seat-blocked' : ''}" data-seat="${index}"
            aria-label="${safariAnimals[index][1]}, ${score} étoiles${blocked.has(index) ? ', en pause pour ce tour' : ''}">
            <span class="safari-mascot">${safariPortrait(safariAnimals[index])}</span>
            <span class="safari-stars" aria-hidden="true">${'★'.repeat(score)}${'☆'.repeat(5-score)}</span>
          </button>`).join('')}
      </div>`;
  }

  function endRound(message) {
    phase = 'result';
    draw(message);
    schedule(nextRound, 1050);
  }

  function react(index, button) {
    if ((phase !== 'ready' && phase !== 'reveal') || blocked.has(index)) return;
    if (phase === 'ready' || !matches) {
      blocked.add(index);
      effect('miss');
      button.classList.add('seat-blocked');
      button.setAttribute('aria-label', button.getAttribute('aria-label') + ', en pause pour ce tour');
      if (blocked.size === playerCount && phase === 'reveal') endRound('Tour suivant');
      return;
    }
    scores[index]++;
    const winner = safariAnimals[index];
    if (scores[index] < 5) {
      effect('point');
      endRound(winner[0] + ' + ⭐');
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
        <p aria-label="Cinq étoiles">★★★★★</p>
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
    if (button.dataset.count || button.dataset.mode) {
      if (button.dataset.count) playerCount = Number(button.dataset.count);
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
