const prismRobots = ['Bulle', 'Cube', 'Fusée', 'Roue'];
const prismColors = [
  { name: 'bleu', mark: '●', paint: '#4484ee' },
  { name: 'or', mark: '◆', paint: '#e6a42e' },
  { name: 'menthe', mark: '▲', paint: '#38c89e' },
  { name: 'rose', mark: '✦', paint: '#e65b9c' },
];
const prismModes = {
  little: { rounds: 8, time: 9000, pause: 1200 },
  family: { rounds: 12, time: 6500, pause: 1000 },
};

function prismRobot(id, color = id) {
  const { name, mark, paint } = prismColors[color];
  return `<span class="prism-robot" role="img" aria-label="${prismRobots[id]}, ${name}" style="--paint:${paint}">
    <img src="./covers/prism-robot-${id}.jpg" alt="" draggable="false">
    <span class="prism-mark" aria-hidden="true">${mark}</span>
  </span>`;
}

const prismRules = `
  <h2>Comment jouer ?</h2>
  <ol>
    <li>Chacun choisit une zone du plateau. Les quatre robots de référence y gardent toujours leur couleur et leur symbole.</li>
    <li>Regarde les robots au centre. Touche dans ta zone le robot qui a la même forme et le même symbole.</li>
    <li>Le premier à trouver un robot correct gagne un éclat. Sur chaque carte, un à trois robots peuvent être corrects. Un robot déjà trouvé ne rapporte plus de point.</li>
    <li>Une erreur bloque tes boutons jusqu’à la carte suivante. À la fin, le plus grand nombre d’éclats gagne. En cas d’égalité, la victoire est partagée.</li>
  </ol>
  <div class="prism-example">
    <strong>Exemple</strong>
    <div>${prismRobot(0)}${prismRobot(0, 3)}</div>
    <p>Bulle porte toujours le rond bleu. Avec l’étoile rose, cette Bulle est un piège.</p>
  </div>`;

function prismShuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const other = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[other]] = [copy[other], copy[i]];
  }
  return copy;
}

function prismGame() {
  let count = 4;
  let mode = 'little';
  let scores = [];
  let round = 0;
  let phase = 'setup';
  let clues = [];
  let deck = [];
  let previousCard = '';
  let locked = new Set();
  let claimed = new Map();
  let timer;
  let progressTimer;
  let remaining = 0;
  let startedAt = 0;
  let soundOn = true;
  let audio;
  const ids = [0, 1, 2, 3];
  const seats = ['Corail', 'Lilas', 'Azur', 'Miel'];

  app.innerHTML = `
    <section class="prism">
      <div class="prism-bar">
        <button class="secondary" id="back">← Jeux</button>
        <button class="secondary" id="prism-sound" aria-pressed="true">🔊 Son</button>
        <button class="secondary" id="prism-rules">? Règles</button>
      </div>
      <div id="prism-stage"></div>
      <dialog class="prism-rules" aria-label="Règles de Prisme Express">
        ${prismRules}
        <form method="dialog"><button class="primary">Compris !</button></form>
      </dialog>
    </section>`;
  const stage = app.querySelector('#prism-stage');
  const rules = app.querySelector('dialog');
  const focus = selector => stage.querySelector(selector)?.focus({ preventScroll:true });

  function sound(notes) {
    if (!soundOn || !window.AudioContext) return;
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    notes.forEach((pitch, index) => {
      const start = audio.currentTime + index * .065;
      const tone = audio.createOscillator();
      const volume = audio.createGain();
      tone.frequency.value = pitch;
      volume.gain.setValueAtTime(.001, start);
      volume.gain.exponentialRampToValueAtTime(.09, start + .018);
      volume.gain.exponentialRampToValueAtTime(.001, start + .20);
      tone.connect(volume).connect(audio.destination);
      tone.start(start);
      tone.stop(start + .21);
    });
  }

  function setup() {
    phase = 'setup';
    stage.innerHTML = `
      <div class="prism-intro">
        <div class="prism-intro-copy">
          <h1>Prisme<br>Express</h1>
          <p>Repère les robots qui ont gardé leur couleur !</p>
          <fieldset><legend>Joueurs</legend><div class="prism-choices">
            ${[2,3,4].map(n => `<button data-count="${n}" aria-pressed="${count === n}">${n}</button>`).join('')}
          </div></fieldset>
          <fieldset><legend>Mode</legend><div class="prism-choices">
            <button data-mode="little" aria-pressed="${mode === 'little'}">Petits</button>
            <button data-mode="family" aria-pressed="${mode === 'family'}">Famille</button>
          </div></fieldset>
          <p class="prism-mode-info">${mode === 'little' ? '8 cartes · Plus de temps pour observer' : '12 cartes · Un rythme plus rapide'}</p>
          <button class="prism-action" data-start>▶ Jouer</button>
        </div>
      </div>`;
  }

  function makeDeck() {
    const cards = [];
    for (let pattern = 1; pattern < (1 << ids.length) - 1; pattern++) {
      const matches = ids.filter(id => pattern & (1 << id));
      cards.push({ matches, key: pattern });
    }
    return prismShuffle(cards);
  }

  function start() {
    scores = Array(count).fill(0);
    round = 0;
    deck = makeDeck();
    if (deck[0].key === previousCard) deck.push(deck.shift());
    sound([392, 523, 659]);
    stage.innerHTML = `
      <div class="prism-table">
        <div class="prism-challenge">
          <p class="prism-round"></p>
          <div class="prism-clues" aria-label="Robots de la carte"></div>
          <div class="prism-timer" aria-hidden="true"><span></span></div>
          <p class="prism-status" role="status"></p>
        </div>
        ${scores.map((_, i) => `
          <section class="prism-seat prism-seat-${i}" aria-label="Joueur ${i + 1}, ${seats[i]}">
            <div class="prism-seat-label"><strong>${seats[i]}</strong><span class="prism-score" aria-label="0 éclat">✦ 0</span></div>
            <div class="prism-controls">
              ${ids.map(id => `<button class="prism-target" data-player="${i}" data-robot="${id}" aria-label="${prismRobots[id]}, ${prismColors[id].name}">${prismRobot(id)}</button>`).join('')}
            </div>
          </section>`).join('')}
      </div>`;
    nextRound();
    focus('[data-player="0"]');
  }

  function setStatus(message) {
    stage.querySelector('.prism-status').textContent = message;
  }

  function nextRound() {
    const config = prismModes[mode];
    if (round === config.rounds) {
      finish();
      return;
    }
    phase = 'live';
    const { matches, key } = deck[round];
    previousCard = key;
    round++;
    locked = new Set();
    claimed = new Map();
    clues = prismShuffle(ids).map(id => ({
      id, color: matches.includes(id) ? id : prismShuffle(ids.filter(color => color !== id))[0],
    }));
    stage.querySelector('.prism-round').textContent = `Carte ${round} / ${config.rounds}`;
    const display = stage.querySelector('.prism-clues');
    display.classList.remove('reveal-answer');
    display.innerHTML = clues.map(({ id, color }) =>
      `<div class="prism-clue" data-clue="${id}">${prismRobot(id, color)}</div>`).join('');
    setStatus('Trouve les bons robots !');
    updateTargets();
    runClock(config.time);
  }

  function updateTargets() {
    for (const button of stage.querySelectorAll('[data-robot]')) {
      const player = Number(button.dataset.player);
      const robot = Number(button.dataset.robot);
      button.classList.toggle('claimed', claimed.has(robot));
      button.classList.toggle('correct', phase === 'result' && clues.some(clue => clue.id === robot && clue.color === robot));
      button.setAttribute('aria-disabled', phase !== 'live' || locked.has(player) || claimed.has(robot));
    }
    stage.querySelectorAll('.prism-seat').forEach((seat, index) => seat.classList.toggle('locked', locked.has(index)));
  }

  function react(button) {
    if (phase !== 'live' || rules.open) return;
    const player = Number(button.dataset.player);
    const robot = Number(button.dataset.robot);
    if (locked.has(player) || claimed.has(robot)) return;
    if (!clues.some(clue => clue.id === robot && clue.color === robot)) {
      locked.add(player);
      sound([280, 196]);
      setStatus(seats[player] + ' attend la carte suivante.');
      updateTargets();
      if (locked.size === count) closeRound();
      return;
    }
    claimed.set(robot, player);
    scores[player]++;
    const score = stage.querySelector(`.prism-seat-${player} .prism-score`);
    score.textContent = `✦ ${scores[player]}`;
    score.setAttribute('aria-label', `${scores[player]} ${scores[player] === 1 ? 'éclat' : 'éclats'}`);
    score.classList.remove('prism-pop');
    void score.offsetWidth;
    score.classList.add('prism-pop');
    const found = stage.querySelector(`[data-clue="${robot}"]`);
    found.classList.add('found', `prism-seat-${player}`);
    sound([523, 659, 784]);
    setStatus(`Un éclat pour ${seats[player]} !`);
    updateTargets();
    if (claimed.size === clues.filter(clue => clue.id === clue.color).length) closeRound();
  }

  function closeRound() {
    phase = 'result';
    stopClock();
    stage.querySelector('.prism-timer span').style.scale = '0 1';
    stage.querySelector('.prism-clues').classList.add('reveal-answer');
    for (const clue of clues) {
      if (clue.id === clue.color) stage.querySelector(`[data-clue="${clue.id}"]`).classList.add('right');
    }
    if (!claimed.size) setStatus('Voici les robots à trouver.');
    updateTargets();
    runClock(prismModes[mode].pause);
  }

  function stopClock() {
    clearTimeout(timer);
    clearInterval(progressTimer);
    timer = undefined;
    remaining = Math.max(0, remaining - (performance.now() - startedAt));
  }

  function runClock(ms) {
    remaining = ms;
    startedAt = performance.now();
    if (phase === 'live') {
      const bar = stage.querySelector('.prism-timer span');
      const tick = () => {
        const ratio = (remaining - (performance.now() - startedAt)) / prismModes[mode].time;
        bar.style.scale = Math.max(0, ratio) + ' 1';
      };
      tick();
      progressTimer = setInterval(tick, 50);
    }
    timer = setTimeout(() => phase === 'live' ? closeRound() : nextRound(), ms);
  }

  function finish() {
    stopClock();
    phase = 'finished';
    const best = Math.max(...scores);
    const winners = scores.map((score, i) => score === best ? seats[i] : null).filter(Boolean);
    sound([523, 659, 784, 1047]);
    stage.innerHTML = `<div class="prism-finish">
      <span class="prism-cup" aria-hidden="true">✦</span>
      <h1>${best === 0 ? 'Bien essayé !' : winners.length === 1 ? winners[0] + ' gagne !' : 'Victoire partagée !'}</h1>
      <p>${best === 0 ? 'Aucun éclat cette fois.' : winners.join(' · ')}</p>
      <ul class="prism-final-scores">${scores.map((score, i) => `<li class="prism-seat-${i}">${seats[i]} <strong>✦ ${score}</strong></li>`).join('')}</ul>
      <div class="prism-choices"><button class="prism-action" data-start>↻ Rejouer</button><button class="secondary" data-setup>Réglages</button></div>
    </div>`;
    focus('[data-start]');
  }

  stage.addEventListener('pointerdown', event => {
    const button = event.target.closest('[data-robot]');
    if (!button || event.button !== 0) return;
    event.preventDefault();
    react(button);
  });

  stage.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-robot')) {
      if (event.detail === 0) react(button);
    } else if (button.hasAttribute('data-start')) start();
    else if (button.hasAttribute('data-setup')) {
      setup();
      focus('[data-start]');
    } else if (button.dataset.count || button.dataset.mode) {
      if (button.dataset.count) count = Number(button.dataset.count);
      if (button.dataset.mode) mode = button.dataset.mode;
      setup();
      focus(button.dataset.count ? `[data-count="${count}"]` : `[data-mode="${mode}"]`);
    }
  });

  app.querySelector('#prism-rules').onclick = () => {
    if (timer !== undefined) stopClock();
    rules.showModal();
  };
  rules.addEventListener('close', () => {
    if (stage.isConnected && (phase === 'live' || phase === 'result')) runClock(remaining);
  });
  app.querySelector('#prism-sound').onclick = event => {
    soundOn = !soundOn;
    if (!soundOn) audio?.suspend().catch(() => {});
    else audio?.resume().catch(() => {});
    event.currentTarget.textContent = soundOn ? '🔊 Son' : '🔇 Son';
    event.currentTarget.setAttribute('aria-pressed', soundOn);
  };
  app.querySelector('#back').onclick = () => {
    stopClock();
    audio?.close().catch(() => {});
    home('[data-detail="prism"]');
  };
  setup();
}
