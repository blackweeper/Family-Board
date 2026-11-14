const tableMenu = ['Taco', 'Chaton', 'Pizza'];
const tableHandSize = 10;
const tableRules = `
  <h2>Comment jouer ?</h2>
  <ol>
    <li>Chacun reçoit dix cartes face cachée.</li>
    <li>À ton tour, touche Taco, Chaton ou Pizza pour retourner la première carte de ta pile.</li>
    <li>Si tu as deviné, tu rejoues. Sinon, la main passe automatiquement au joueur suivant. La carte retournée quitte ta pile dans les deux cas.</li>
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
  const soundtrack = familyMusic();
  let count = 4;
  let active = 0;
  let piles = [];
  let phase = 'setup';
  let last = null;
  let topCard = null;
  let timer;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let soundOn = true;
  let audio;
  const players = [
    { name:'Goncalo', color:'#ff9b9d' }, { name:'Raphael', color:'#cbb0ff' },
    { name:'Aurelie', color:'#90e1c5' }, { name:'Marius', color:'#ffda85' },
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
    soundtrack.stop();
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
    soundtrack.start('table');
    piles = tableDeal(count);
    active = 0;
    last = null;
    topCard = null;
    phase = 'pick';
    sound([392, 523, 659]);
    render();
    focus('[data-guess]:enabled');
  }

  function guess(id) {
    if (phase !== 'pick' || rules.open) return;
    const source = stage.querySelector(`.table-seat-${active} .table-hand .table-stack:last-child`);
    const origin = source.getBoundingClientRect();
    const card = piles[active].pop();
    last = { card, guess:id, correct:card === id };
    phase = 'flight';
    render();
    const end = stage.querySelector('.table-card').getBoundingClientRect();
    const duration = reducedMotion.matches ? 0 : 420;
    if (duration && source.animate) {
      const moving = document.createElement('div');
      moving.className = 'table-card table-back table-flying';
      moving.setAttribute('aria-hidden', 'true');
      moving.textContent = '✦';
      Object.assign(moving.style, { left: end.left + 'px', top: end.top + 'px', width: end.width + 'px', height: end.height + 'px' });
      stage.querySelector('.table-board').append(moving);
      moving.animate([
        { transform: `translate(${origin.x + origin.width/2 - end.x - end.width/2}px, ${origin.y + origin.height/2 - end.y - end.height/2}px) scale(.27) rotate(-16deg)` },
        { transform: 'translate(0,0) scale(1) rotate(0)' },
      ], {duration, easing:'cubic-bezier(.2,.75,.25,1)', fill:'forwards'});
    }
    timer = setTimeout(reveal, duration);
  }

  function reveal() {
    topCard = last.card;
    phase = 'reveal';
    sound(last.correct ? [523, 659, 784] : [349, 262]);
    render();
    timer = setTimeout(piles[active].length ? advance : finish, 1250);
  }

  function advance() {
    const outgoing = stage.querySelector('.table-dock');
    const previousDock = outgoing.getBoundingClientRect();
    const previousAngle = parseFloat(getComputedStyle(outgoing).rotate) || 0;
    const previous = active;
    if (!last.correct) active = (active + 1) % count;
    phase = 'pick';
    render();
    const dock = stage.querySelector('.table-dock');
    if (active !== previous && !reducedMotion.matches && dock.animate && getComputedStyle(dock).rotate !== 'none') {
      const currentDock = dock.getBoundingClientRect();
      const x = previousDock.x + previousDock.width / 2 - currentDock.x - currentDock.width / 2;
      const y = previousDock.y + previousDock.height / 2 - currentDock.y - currentDock.height / 2;
      const currentAngle = parseFloat(getComputedStyle(dock).rotate) || 0;
      const offset = (previousAngle - currentAngle + 540) % 360 - 180;
      stage.querySelector('.table-discard').animate([
        { rotate: `${currentAngle + offset}deg` },
        { rotate: `${currentAngle}deg` },
      ], { duration: 320, easing: 'ease-out' });
      dock.animate([
        { translate: `calc(-50% + ${x}px) calc(-50% + ${y}px)`, rotate: `${currentAngle + offset}deg`, opacity: .6 },
        { translate: '-50% -50%', rotate: `${currentAngle}deg`, opacity: 1 },
      ], { duration: 320, easing: 'cubic-bezier(.2,.75,.25,1)' });
    }
    focus('[data-guess]:enabled');
  }

  function seats() {
    return piles.map((pile, i) => {
      const player = players[i];
      return `<div class="table-player table-seat-${i} ${i === active ? 'current' : ''}" style="--player:${player.color}" role="group"
        aria-label="Joueur ${i+1} ${player.name}, ${pile.length} ${pile.length === 1 ? 'carte' : 'cartes'}"${i === active ? ' aria-current="true"' : ''}>
        <div class="table-player-label"><strong>${i+1} · ${player.name}</strong><span class="table-count" aria-hidden="true"><i></i>${pile.length}</span></div>
        <div class="table-hand" aria-hidden="true">${pile.map(()=>'<span class="table-stack">✦</span>').join('')}</div>
      </div>`;
    }).join('');
  }

  function render() {
    rulesButton.disabled = phase !== 'pick';
    const player = players[active];
    const revealed = phase === 'reveal';
    const nextPlayer = players[(active + 1) % count];
    const result = revealed ? (last.correct ? 'hit' : 'miss') : '';
    const status = phase === 'flight' ? 'La carte rejoint la pile…' : !revealed ? 'Choisis une image pour retourner ta carte.' :
      !piles[active].length ? 'Plus aucune carte dans ta pile !' :
      last.correct ? 'Bien deviné ! Tu rejoues.' : `Tu avais choisi ${tableMenu[last.guess]}. À ${nextPlayer.name} de jouer.`;
    stage.innerHTML = `<div class="table-board" data-phase="${phase}" data-active="${active}" data-result="${result}">
      ${seats()}
      <div class="table-center">
        <span class="table-turn" style="--player:${player.color}">● Tour de ${player.name}</span>
        <div class="table-discard" data-filled="${topCard !== null}">
          ${topCard !== null ? `<figure class="table-card ${revealed ? 'fresh' : ''}" aria-label="Carte révélée : ${tableMenu[topCard]}">${tableImage(topCard)}</figure>` :
            '<div class="table-card table-back" role="img" aria-label="Carte face cachée">✦</div>'}
          ${revealed ? `<span class="table-result" aria-hidden="true">${last.correct ? '✓' : '×'}</span>` : ''}
        </div>
        <p class="table-status" role="status">${status}</p>
      </div>
      <div class="table-dock">
        <div class="table-guesses" aria-label="Choisis la prochaine carte">
          ${tableMenu.map((name,id) => `<button data-guess="${id}" aria-label="${name}" ${phase === 'pick' ? '' : 'disabled'}
            class="${revealed && id === last.card ? 'match' : revealed && id === last.guess ? 'wrong' : ''}">${tableImage(id)}</button>`).join('')}
        </div>
      </div>
    </div>`;
  }

  function finish() {
    soundtrack.stop();
    phase = 'finished';
    rulesButton.disabled = false;
    const player = players[active];
    sound([523, 659, 784, 1047]);
    stage.innerHTML = `<div class="table-finish" style="--player:${player.color}">
      <figure class="table-card fresh" aria-label="${tableMenu[last.card]}">${tableImage(last.card)}</figure>
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
  });

  rulesButton.onclick = () => rules.showModal();
  app.querySelector('#table-sound').onclick = event => {
    soundOn = !soundOn;
    soundtrack.mute(!soundOn);
    if (soundOn) audio?.resume().catch(() => {});
    else audio?.suspend().catch(() => {});
    event.currentTarget.textContent = soundOn ? '🔊 Son' : '🔇 Son';
    event.currentTarget.setAttribute('aria-pressed', soundOn);
  };
  app.querySelector('#back').onclick = () => {
    clearTimeout(timer);
    soundtrack.close();
    audio?.close().catch(() => {});
    home('[data-detail="table"]');
  };
  setup();
}
