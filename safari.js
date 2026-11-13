const safariAnimals = [['🐼','Panda'], ['🦊','Renard'], ['🐸','Grenouille'], ['🦁','Lion'], ['🐵','Singe']];
const safariRules = `
  <h2>Comment jouer ?</h2>
  <ol>
    <li>Choisis ton animal et place-toi devant sa zone colorée.</li>
    <li>Regarde l’animal à gauche, puis attends que la carte de droite se retourne.</li>
    <li>Deux animaux identiques ? Tape ta zone le plus vite possible. En mode Famille, la carte ⚡ invite tout le monde à taper.</li>
    <li>Si tu tapes trop tôt ou sur deux animaux différents, ta zone se bloque pour ce tour.</li>
    <li>Le premier bon réflexe rapporte une étoile. Avec cinq étoiles, tu gagnes !</li>
  </ol>`;

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

  function silence() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  function announce(word) {
    if (!soundOn || !('speechSynthesis' in window)) return;
    silence();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
  }

  function chime() {
    if (!soundOn || audio?.state !== 'running') return;
    [523, 659, 784].forEach((frequency, index) => {
      const start = audio.currentTime + index * .07;
      const note = audio.createOscillator();
      const gain = audio.createGain();
      note.frequency.value = frequency;
      gain.gain.setValueAtTime(.09, start);
      gain.gain.exponentialRampToValueAtTime(.001, start + .16);
      note.connect(gain).connect(audio.destination);
      note.start(start);
      note.stop(start + .17);
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
    if (soundOn && window.AudioContext) {
      audio ??= new AudioContext();
      audio.resume().catch(() => {});
    }
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
    announce(target[1]);
    schedule(() => {
      phase = 'reveal';
      draw(card[0] === '⚡' ? '⚡' : 'À toi de regarder !');
      schedule(() => endRound(blocked.size === playerCount ? 'Tour suivant' : matches ? 'Bien essayé !' : 'Bien vu !'), mode === 'little' ? 2450 : 1450);
    }, (mode === 'little' ? 1350 : 780) + Math.random() * 800);
  }

  function draw(message) {
    stage.innerHTML = `
      <div class="safari-table seats-${playerCount}">
        <div class="safari-center">
          <div class="safari-cards">
            <div class="safari-card" aria-label="${target[1]}">${target[0]}</div>
            <div class="safari-card ${phase === 'ready' ? 'face-down' : ''}" aria-label="${phase === 'ready' ? 'Carte cachée' : card[1]}">${phase === 'ready' ? '✦' : card[0]}</div>
          </div>
          <p class="safari-status" role="status">${message}</p>
        </div>
        ${scores.map((score, index) => `
          <button class="safari-seat seat-${index} ${blocked.has(index) ? 'seat-blocked' : ''}" data-seat="${index}"
            aria-label="${safariAnimals[index][1]}, ${score} étoiles${blocked.has(index) ? ', en pause pour ce tour' : ''}">
            <span class="safari-mascot">${safariAnimals[index][0]}</span>
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
      button.classList.add('seat-blocked');
      button.setAttribute('aria-label', button.getAttribute('aria-label') + ', en pause pour ce tour');
      if (blocked.size === playerCount && phase === 'reveal') endRound('Tour suivant');
      return;
    }
    scores[index]++;
    chime();
    const winner = safariAnimals[index];
    if (scores[index] < 5) {
      endRound(winner[0] + ' + ⭐');
      return;
    }
    clearTimeout(timer);
    phase = 'finished';
    announce(winner[1] + ' gagne !');
    stage.innerHTML = `
      <div class="safari-victory">
        <span aria-hidden="true">${winner[0]}</span>
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
    silence();
    rules.showModal();
  };
  rules.addEventListener('close', () => {
    if (stage.isConnected && ['ready','reveal','result'].includes(phase)) nextRound();
  });
  app.querySelector('#safari-sound').onclick = event => {
    soundOn = !soundOn;
    if (!soundOn) silence();
    event.currentTarget.setAttribute('aria-pressed', soundOn);
    event.currentTarget.textContent = soundOn ? '🔊 Son' : '🔇 Son';
  };
  app.querySelector('#back').onclick = () => {
    clearTimeout(timer);
    silence();
    audio?.close().catch(() => {});
    home('[data-detail="safari"]');
  };
  setup();
}
