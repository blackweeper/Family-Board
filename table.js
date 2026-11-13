const tableMenu = ['Taco', 'Chaton', 'Pizza'];
const tableHandSize = 10;
const tableRules = `
  <h2>Comment jouer ?</h2>
  <ol>
    <li>Chacun reçoit dix cartes face cachée.</li>
    <li>À ton tour, touche Taco, Chaton ou Pizza pour retourner la première carte de ta pile.</li>
    <li>Si tu as deviné, tu rejoues. Sinon, la main passe au joueur suivant. La carte retournée quitte ta pile dans les deux cas.</li>
    <li>Si c’était ta dernière carte, tu gagnes, même si tu avais choisi une autre image.</li>
  </ol>`;

function tableImage(id) {
  return `<img src="./covers/table-card-${id}.jpg" alt="" draggable="false">`;
}

function tableDeal(count) {
  const deck = Array.from({length:42}, (_, i) => i % tableMenu.length);
  for (let i = deck.length - 1; i > 0; i--) {
    const other = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[other]] = [deck[other], deck[i]];
  }
  return Array.from({length:count}, (_, i) => deck.slice(i * tableHandSize, (i + 1) * tableHandSize));
}

function tableGame() {
  let count = 4;
  let active = 0;
  let piles = [];
  let phase = 'setup';
  let last = null;
  let timer;
  let soundOn = true;
  let audio;
  const players = [
    { name:'Corail', color:'#ff9b9d' }, { name:'Lilas', color:'#cbb0ff' },
    { name:'Menthe', color:'#90e1c5' }, { name:'Miel', color:'#ffda85' },
  ];

  app.innerHTML = `<section class="table-game">
    <div class="table-bar">
      <button class="secondary" id="back">← Jeux</button>
      <button class="secondary" id="table-sound" aria-pressed="true">🔊 Son</button>
      <button class="secondary" id="table-rules">? Règles</button>
    </div>
    <div id="table-stage"></div>
    <dialog class="table-rules" aria-label="Règles du jeu À table !">
      ${tableRules}<form method="dialog"><button class="primary">Compris !</button></form>
    </dialog>
  </section>`;
  const stage = app.querySelector('#table-stage');
  const rules = app.querySelector('.table-rules');
  const rulesButton = app.querySelector('#table-rules');
  const focus = selector => stage.querySelector(selector)?.focus({ preventScroll:true });

  function sound(notes) {
    if (!soundOn || !window.AudioContext) return;
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    notes.forEach((pitch, i) => {
      const start = audio.currentTime + i * .075;
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.type = 'sine';
      tone.frequency.value = pitch;
      gain.gain.setValueAtTime(.001, start);
      gain.gain.exponentialRampToValueAtTime(.10, start + .016);
      gain.gain.exponentialRampToValueAtTime(.001, start + .19);
      tone.connect(gain).connect(audio.destination);
      tone.start(start);
      tone.stop(start + .20);
    });
  }

  function setup() {
    phase = 'setup';
    stage.innerHTML = `<div class="table-intro">
      <div class="table-intro-copy">
        <h1>À table !</h1>
        <p>Taco, chaton ou pizza ?<br>Devine la prochaine carte.</p>
        <fieldset><legend>Joueurs</legend><div class="table-options">
          ${[2,3,4].map(n => `<button data-count="${n}" aria-pressed="${count === n}">${n}</button>`).join('')}
        </div></fieldset>
        <button class="table-primary" data-start>▶ Jouer</button>
      </div>
    </div>`;
  }

  function start() {
    piles = tableDeal(count);
    active = 0;
    last = null;
    phase = 'pick';
    sound([392, 523, 659]);
    render();
    focus('[data-guess]:enabled');
  }

  function guess(id) {
    if (phase !== 'pick' || rules.open) return;
    const card = piles[active].pop();
    last = { card, guess:id, correct:card === id };
    phase = 'reveal';
    sound(last.correct ? [523, 659, 784] : [349, 262]);
    render();
    if (!piles[active].length) {
      timer = setTimeout(finish, 900);
      return;
    }
    focus('[data-next]');
  }

  function advance() {
    if (phase !== 'reveal' || !piles[active].length) return;
    if (!last.correct) active = (active + 1) % count;
    phase = 'pick';
    render();
    focus('[data-guess]:enabled');
  }

  function seats() {
    return piles.map((pile, i) => {
      const player = players[i];
      return `<div class="table-player ${i === active ? 'current' : ''}" style="--player:${player.color}" role="group"
        aria-label="${player.name}, ${pile.length} ${pile.length === 1 ? 'carte' : 'cartes'}"${i === active ? ' aria-current="true"' : ''}>
        <span class="table-stack" aria-hidden="true">✦</span><div><strong>${player.name}</strong><small>${pile.length} / ${tableHandSize}</small></div>
      </div>`;
    }).join('');
  }

  function render() {
    rulesButton.disabled = phase === 'reveal' && !piles[active].length;
    const player = players[active];
    const revealed = phase === 'reveal';
    const nextPlayer = players[(active + 1) % count];
    const status = !revealed ? 'Choisis une image pour retourner ta carte.' :
      !piles[active].length ? 'Plus aucune carte dans ta pile !' :
      last.correct ? 'Bien deviné ! Tu rejoues.' : `Tu avais choisi ${tableMenu[last.guess]}. À ${nextPlayer.name} de jouer.`;
    stage.innerHTML = `<div class="table-board" data-phase="${phase}">
      <div class="table-players" style="--players:${count}">${seats()}</div>
      <div class="table-center">
        <span class="table-turn" style="--player:${player.color}">● Tour de ${player.name}</span>
        ${last ? `<figure class="table-card ${revealed ? 'fresh' : ''}" aria-label="Carte révélée : ${tableMenu[last.card]}">${tableImage(last.card)}<figcaption>${tableMenu[last.card]}</figcaption></figure>` :
          '<div class="table-card table-back" role="img" aria-label="Carte face cachée">✦</div>'}
        <p class="table-status" role="status">${status}</p>
      </div>
      <div class="table-dock">
        ${revealed ? `<button class="table-primary" data-next ${piles[active].length ? '' : 'disabled'}>
          ${!piles[active].length ? 'Dernière carte !' : last.correct ? '↻ Rejouer' : `→ Au tour de ${nextPlayer.name}`}</button>` :
          `<div class="table-guesses" aria-label="Choisis la prochaine carte">${tableMenu.map((name,id)=>`<button data-guess="${id}">${tableImage(id)}<span>${name}</span></button>`).join('')}</div>`}
      </div>
    </div>`;
  }

  function finish() {
    phase = 'finished';
    rulesButton.disabled = false;
    const player = players[active];
    sound([523, 659, 784, 1047]);
    stage.innerHTML = `<div class="table-finish" style="--player:${player.color}">
      <figure class="table-card fresh">${tableImage(last.card)}<figcaption>${tableMenu[last.card]}</figcaption></figure>
      <h1>${player.name} gagne !</h1>
      <p>Ses dix cartes ont été jouées.</p>
      <div class="table-options"><button class="table-primary" data-start>↻ Nouvelle partie</button><button class="secondary" data-setup>Réglages</button></div>
    </div>`;
    focus('[data-start]');
  }

  stage.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled || rules.open) return;
    if (button.dataset.count) {
      count = Number(button.dataset.count);
      setup();
      focus(`[data-count="${count}"]`);
    } else if (button.hasAttribute('data-start')) start();
    else if (button.hasAttribute('data-setup')) {
      setup();
      focus('[data-start]');
    } else if (button.hasAttribute('data-guess')) guess(Number(button.dataset.guess));
    else if (button.hasAttribute('data-next')) advance();
  });

  rulesButton.onclick = () => rules.showModal();
  app.querySelector('#table-sound').onclick = event => {
    soundOn = !soundOn;
    if (soundOn) audio?.resume().catch(() => {});
    else audio?.suspend().catch(() => {});
    event.currentTarget.textContent = soundOn ? '🔊 Son' : '🔇 Son';
    event.currentTarget.setAttribute('aria-pressed', soundOn);
  };
  app.querySelector('#back').onclick = () => {
    clearTimeout(timer);
    audio?.close().catch(() => {});
    home('[data-detail="table"]');
  };
  setup();
}
