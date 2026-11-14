const prismCharacters = [
  { name:'Cochon', color:'rose', paint:'#ffabc0' },
  { name:'Fantôme', color:'blanc', paint:'#f3efff' },
  { name:'Poule', color:'jaune', paint:'#ffdf76' },
  { name:'Grenouille', color:'verte', paint:'#aee779' },
  { name:'Lapin', color:'bleu', paint:'#91cfff' },
  { name:'Écureuil', color:'roux', paint:'#ffac7e' },
  { name:'Hérisson', color:'violet', paint:'#c7a9ff' },
  { name:'Tortue', color:'turquoise', paint:'#8ff0da' },
];
const prismModes = {
  little: { rounds: 20, time: 9000, pause: 1200 },
  family: { rounds: 20, time: 6500, pause: 1000 },
};

function prismPortrait(id, color = id) {
  const character = prismCharacters[id];
  return `<span class="prism-portrait" role="img" aria-label="${character.name}, ${prismCharacters[color].color}"${color === id ? '' : ` data-tint="${color}"`}>
    <img src="./covers/prism-character-${id}.png" alt="" draggable="false">
  </span>`;
}

const prismRules = `
  <h2>Comment jouer ?</h2>
  <ol>
    <li>Choisis ton personnage et installe-toi devant sa place.</li>
    <li>Au milieu, cherche le cochon rose, le fantôme blanc, la poule jaune ou la grenouille verte. Si tu en vois un avec sa vraie couleur, touche son image dans ta rangée.</li>
    <li>Chaque bonne réponse rapporte un éclat au premier qui la trouve. Il peut y avoir une, deux ou trois bonnes réponses.</li>
    <li>Si tu te trompes, attends la carte suivante. Celui qui a le plus d’éclats à la fin gagne.</li>
  </ol>
  <div class="prism-example">
    <div>${prismPortrait(0)}${prismPortrait(0, 3)}</div>
    <p>Touche le cochon si tu le vois en rose. En vert, c’est un piège.</p>
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
  const soundtrack = familyMusic();
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
  const lineup = [...ids];
  let selectedSeat = 0;
  const mascot = player => prismCharacters[lineup[player]];

  app.innerHTML = `
    <section class="prism">
      <div class="prism-bar">
        <button class="secondary" id="back">← Jeux</button>
        <button class="secondary" id="prism-sound" aria-pressed="true">🔊 Son</button>
        <button class="secondary" id="prism-rules">? Règles</button>
      </div>
      <div id="prism-stage"></div>
      <dialog class="prism-rules" aria-label="Règles des Couleurs en cavale">
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
    soundtrack.stop();
    phase = 'setup';
    stage.innerHTML = `
      <div class="prism-intro">
        <div class="prism-intro-copy">
          <h1>Couleurs<br>en cavale</h1>
          <p>Retrouve les personnages dans leur vraie couleur !</p>
          <fieldset><legend>Joueurs</legend><div class="prism-choices">
            ${[2,3,4].map(n => `<button data-count="${n}" aria-pressed="${count === n}">${n}</button>`).join('')}
          </div></fieldset>
          <fieldset><legend>Choisis ton personnage</legend>
            <div class="prism-lineup" aria-label="Places des joueurs">
              ${lineup.slice(0,count).map((id,i) => `<button data-seat="${i}" aria-label="Joueur ${i + 1}, ${mascot(i).name}" aria-pressed="${i === selectedSeat}">${prismPortrait(id)}<span>${i + 1}</span></button>`).join('')}
            </div>
            <div class="prism-picker" aria-label="Personnage du joueur ${selectedSeat + 1}">
              ${prismCharacters.map((_,id) => `<button data-character="${id}" aria-label="${prismCharacters[id].name}" aria-pressed="${id === lineup[selectedSeat]}">${prismPortrait(id)}</button>`).join('')}
            </div>
          </fieldset>
          <fieldset><legend>Mode</legend><div class="prism-choices">
            <button data-mode="little" aria-pressed="${mode === 'little'}">Petits</button>
            <button data-mode="family" aria-pressed="${mode === 'family'}">Famille</button>
          </div></fieldset>
          <p class="prism-mode-info">${mode === 'little' ? '20 cartes · Plus de temps pour observer' : '20 cartes · Un rythme plus rapide'}</p>
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
    soundtrack.start('prism');
    scores = Array(count).fill(0);
    round = 0;
    deck = [];
    while (deck.length < prismModes[mode].rounds) {
      const batch = makeDeck();
      const lastKey = deck.at(-1)?.key ?? previousCard;
      if (batch[0].key === lastKey) batch.push(batch.shift());
      deck.push(...batch);
    }
    sound([392, 523, 659]);
    stage.innerHTML = `
      <div class="prism-table" data-count="${count}">
        <div class="prism-challenge">
          <p class="prism-round"></p>
          <div class="prism-clues" aria-label="Personnages à observer"></div>
          <div class="prism-timer" aria-hidden="true"><span></span></div>
          <p class="prism-status" role="status"></p>
        </div>
        ${scores.map((_, i) => `
          <section class="prism-seat prism-seat-${i}" style="--seat:${mascot(i).paint}" aria-label="Joueur ${i + 1}, ${mascot(i).name}">
            <div class="prism-seat-label">${prismPortrait(lineup[i])}<span class="prism-score" aria-label="0 éclat">✦ 0</span></div>
            <div class="prism-controls">
              ${ids.map(id => `<button class="prism-target" data-player="${i}" data-target="${id}" aria-label="${prismCharacters[id].name}, ${prismCharacters[id].color}">${prismPortrait(id)}</button>`).join('')}
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
      `<div class="prism-clue" data-clue="${id}">${prismPortrait(id, color)}</div>`).join('');
    setStatus('Retrouve les bonnes couleurs !');
    updateTargets();
    runClock(config.time);
  }

  function updateTargets() {
    for (const button of stage.querySelectorAll('[data-target]')) {
      const player = Number(button.dataset.player);
      const target = Number(button.dataset.target);
      button.classList.toggle('claimed', claimed.has(target));
      button.classList.toggle('correct', phase === 'result' && clues.some(clue => clue.id === target && clue.color === target));
      button.setAttribute('aria-disabled', phase !== 'live' || locked.has(player) || claimed.has(target));
    }
    stage.querySelectorAll('.prism-seat').forEach((seat, index) => seat.classList.toggle('locked', locked.has(index)));
  }

  function react(button) {
    if (phase !== 'live' || rules.open) return;
    const player = Number(button.dataset.player);
    const target = Number(button.dataset.target);
    if (locked.has(player) || claimed.has(target)) return;
    if (!clues.some(clue => clue.id === target && clue.color === target)) {
      locked.add(player);
      sound([280, 196]);
      setStatus(mascot(player).name + ' attend la carte suivante.');
      updateTargets();
      if (locked.size === count) closeRound();
      return;
    }
    claimed.set(target, player);
    scores[player]++;
    const score = stage.querySelector(`.prism-seat-${player} .prism-score`);
    score.textContent = `✦ ${scores[player]}`;
    score.setAttribute('aria-label', `${scores[player]} ${scores[player] === 1 ? 'éclat' : 'éclats'}`);
    score.classList.remove('prism-pop');
    void score.offsetWidth;
    score.classList.add('prism-pop');
    const found = stage.querySelector(`[data-clue="${target}"]`);
    found.classList.add('found');
    found.style.setProperty('--seat', mascot(player).paint);
    sound([523, 659, 784]);
    setStatus(`Un éclat pour ${mascot(player).name} !`);
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
    if (!claimed.size) setStatus('Voici les bonnes couleurs.');
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
    soundtrack.stop();
    stopClock();
    phase = 'finished';
    const best = Math.max(...scores);
    const winners = scores.flatMap((score, i) => best > 0 && score === best ? [i] : []);
    const title = best === 0 ? 'Bien essayé !' : winners.length === 1 ? mascot(winners[0]).name + ' gagne !' :
      'Victoire partagée ! ' + winners.map(i => mascot(i).name).join(', ');
    const confetti = winners.length ? Array.from({ length: 24 }, (_, i) => {
      const angle = Math.PI * 2 * i / 24;
      const radius = .62 + (i % 4) * .11;
      const x = (Math.cos(angle) * radius).toFixed(3);
      const y = (Math.sin(angle) * radius).toFixed(3);
      return `<i style="--x:${x};--y:${y};--delay:${i % 5 * 55}ms;--spin:${120 + i * 43}deg"></i>`;
    }).join('') : '';
    sound([523, 659, 784, 1047]);
    stage.innerHTML = `<div class="prism-finish">
      <h1 tabindex="-1" class="${winners.length ? 'prism-result-heading' : ''}">${title}</h1>
      ${winners.length ? `<div class="prism-celebration" data-winners="${winners.length}">
        <div class="prism-confetti" aria-hidden="true">${confetti}</div>
        <div class="prism-podiums">${winners.map((i, place) => `
          <div class="prism-podium" style="--seat:${mascot(i).paint};--arrival:${place * 110}ms">
            <span class="prism-winner-trophy" aria-hidden="true">🏆</span>
            <div class="prism-winner-portrait">${prismPortrait(lineup[i])}</div>
            <div class="prism-podium-base" aria-hidden="true"><span>✦</span>${best}</div>
          </div>`).join('')}</div>
      </div>` : '<span class="prism-result-star" aria-hidden="true">✦</span><p>Aucun éclat cette fois.</p>'}
      <ul class="prism-final-scores">${scores.map((score, i) => `<li style="--seat:${mascot(i).paint}" aria-label="${mascot(i).name}, ${score} éclats"${winners.includes(i) ? ' data-winner' : ''}>${prismPortrait(lineup[i])}<strong>✦ ${score}</strong></li>`).join('')}</ul>
      <div class="prism-choices"><button class="prism-action" data-start>↻ Rejouer</button><button class="secondary" data-setup>Réglages</button></div>
    </div>`;
    focus('.prism-finish h1');
  }

  stage.addEventListener('pointerdown', event => {
    const button = event.target.closest('[data-target]');
    if (!button || event.button !== 0) return;
    event.preventDefault();
    react(button);
  });

  stage.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-target')) {
      if (event.detail === 0) react(button);
    } else if (button.hasAttribute('data-start')) start();
    else if (button.hasAttribute('data-setup')) {
      setup();
      focus('[data-start]');
    } else if (button.hasAttribute('data-seat')) {
      selectedSeat = Number(button.dataset.seat);
      setup();
      focus(`[data-seat="${selectedSeat}"]`);
    } else if (button.hasAttribute('data-character')) {
      const id = Number(button.dataset.character);
      const previous = lineup.indexOf(id);
      if (previous !== -1) lineup[previous] = lineup[selectedSeat];
      lineup[selectedSeat] = id;
      setup();
      focus(`[data-character="${id}"]`);
    } else if (button.dataset.count || button.dataset.mode) {
      if (button.dataset.count) {
        count = Number(button.dataset.count);
        selectedSeat = Math.min(selectedSeat, count - 1);
      }
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
    soundtrack.mute(!soundOn);
    if (!soundOn) audio?.suspend().catch(() => {});
    else audio?.resume().catch(() => {});
    event.currentTarget.textContent = soundOn ? '🔊 Son' : '🔇 Son';
    event.currentTarget.setAttribute('aria-pressed', soundOn);
  };
  app.querySelector('#back').onclick = () => {
    stopClock();
    soundtrack.close();
    audio?.close().catch(() => {});
    home('[data-detail="prism"]');
  };
  setup();
}
