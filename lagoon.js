const lagoonCrew = [
  { name: 'Loutre', portrait: 'otter', color: '#73e0d4' },
  { name: 'Crabe', portrait: 'crab', color: '#ffa18a' },
  { name: 'Poulpe', portrait: 'octopus', color: '#c7aaff' },
  { name: 'Tortue', portrait: 'turtle', color: '#f7d278' },
  { name: 'Macareux', portrait: 'puffin', color: '#9fd0ff' },
  { name: 'Hippocampe', portrait: 'seahorse', color: '#a3e9b7' },
  { name: 'Axolotl', portrait: 'axolotl', color: '#ffc0e2' },
  { name: 'Dauphin', portrait: 'dolphin', color: '#b7dcff' },
];
const lagoonTreasures = [
  'Coquillage', 'Cristal', 'Pièce', 'Corail', 'Étoile de mer', 'Boussole',
];
const lagoonGoal = 10;
const lagoonRules = `
  <h2>Comment jouer ?</h2>
  <ol>
    <li>À ton tour, touche <strong>Piocher</strong>. Tu peux révéler jusqu’à cinq trésors.</li>
    <li><strong>Encaisser</strong> rapporte une perle par trésor différent : 1, 2, 3 ou 4 perles selon le nombre de cartes révélées.</li>
    <li>Un trésor en double fait tanguer ton radeau. Tu perds les trouvailles de ce tour et la main passe au suivant.</li>
    <li>Au troisième tangage, plouf ! Tu perds deux perles en réserve, avec un minimum de zéro. Ton radeau repart droit.</li>
    <li><strong>Cinq trésors différents dans le même tour</strong> donnent la victoire immédiate. Tu peux aussi gagner en mettant dix perles à l’abri au fil des tours.</li>
  </ol>`;

function lagoonGame() {
  let count = 4;
  let seat = 0;
  const lineup = lagoonCrew.slice(0, 4);
  let active = 0;
  let fleet = [];
  let haul = [];
  let phase = 'setup';
  let message = '';
  let splashed = false;
  let fullChest = false;
  let muted = false;
  let audio;

  app.innerHTML = `
    <section class="lagoon">
      <div class="lagoon-bar">
        <button type="button" class="secondary" id="back">← Jeux</button>
        <button type="button" class="secondary" id="lagoon-sound" aria-pressed="true">🔊 Son</button>
        <button type="button" class="secondary" id="lagoon-rules">? Règles</button>
      </div>
      <div id="lagoon-stage"></div>
      <dialog class="lagoon-rules" aria-labelledby="lagoon-rules-heading">
        <div id="lagoon-rules-heading">${lagoonRules}</div>
        <form method="dialog"><button class="primary">Compris !</button></form>
      </dialog>
    </section>`;
  const stage = app.querySelector('#lagoon-stage');
  const rules = app.querySelector('.lagoon-rules');
  const focus = selector => stage.querySelector(selector)?.focus({ preventScroll: true });
  const portrait = crew => `<img src="./covers/lagoon-${crew.portrait}.jpg" alt="" draggable="false">`;

  function sound(notes) {
    if (muted || !window.AudioContext) return;
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    notes.forEach((frequency, i) => {
      const start = audio.currentTime + i * .075;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.001, start);
      gain.gain.exponentialRampToValueAtTime(.11, start + .018);
      gain.gain.exponentialRampToValueAtTime(.001, start + .18);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + .19);
    });
  }

  function setup() {
    phase = 'setup';
    stage.innerHTML = `
      <div class="lagoon-intro">
        <div class="lagoon-intro-copy">
          <h1>Lagon des<br>Trésors</h1>
          <p>Encore un trésor ou retour au radeau ?</p>
          <fieldset><legend>Combien de joueurs ?</legend>
            <div class="lagoon-choices">${[2,3,4].map(n => `<button data-count="${n}" aria-pressed="${count === n}">${n}</button>`).join('')}</div>
          </fieldset>
          <fieldset><legend>Équipages</legend>
            <div class="lagoon-choices">
              ${lineup.slice(0, count).map((crew, i) => `<button data-seat="${i}" aria-label="Joueur ${i + 1}, ${crew.name}" aria-pressed="${seat === i}">${i + 1} ${portrait(crew)}</button>`).join('')}
            </div>
            <div class="lagoon-crew" aria-label="Choisir l’animal du joueur ${seat + 1}">
              ${lagoonCrew.map((crew,i) => `<button data-crew="${i}" style="--crew:${crew.color}" aria-label="${crew.name}" aria-pressed="${lineup[seat] === crew}">${portrait(crew)}</button>`).join('')}
            </div>
          </fieldset>
          <button class="lagoon-action" data-start>▶ Jouer</button>
        </div>
        <img class="lagoon-intro-art" src="./covers/lagoon.jpg" alt="" draggable="false">
      </div>`;
  }

  function start() {
    fleet = lineup.slice(0, count).map(crew => ({ ...crew, bank: 0, tilt: 0 }));
    active = 0;
    startTurn();
    sound([392, 523, 659]);
  }

  function startTurn() {
    haul = [];
    phase = 'turn';
    splashed = false;
    fullChest = false;
    message = `À ${fleet[active].name} de jouer !`;
    render();
    focus('[data-draw]');
  }

  function draw() {
    if (phase !== 'turn' || haul.length >= 5) return;
    const treasure = Math.floor(Math.random() * lagoonTreasures.length);
    const duplicate = haul.includes(treasure);
    haul.push(treasure);
    if (!duplicate) {
      if (haul.length === 5) {
        fullChest = true;
        win();
        return;
      }
      message = 'Encore ou j’encaisse ?';
      sound([523, 659]);
      render();
      focus(haul.length < 5 ? '[data-draw]' : '[data-bank]');
      return;
    }
    const crew = fleet[active];
    crew.tilt++;
    phase = 'duplicate';
    message = 'En double ! Le radeau tangue.';
    if (crew.tilt === 3) {
      crew.tilt = 0;
      const lost = Math.min(crew.bank, 2);
      crew.bank -= lost;
      splashed = true;
      message = lost ? `Plouf ! −${lost} ${lost === 1 ? 'perle' : 'perles'} en réserve.` : 'Plouf ! Le radeau repart droit.';
    }
    sound(splashed ? [330, 196, 110] : [349, 247]);
    render();
    focus('[data-next]');
  }

  function bank() {
    if (phase !== 'turn' || !haul.length) return;
    const crew = fleet[active];
    const award = haul.length;
    crew.bank += award;
    if (crew.bank >= lagoonGoal) {
      win();
      return;
    }
    phase = 'banked';
    message = `+${award} ${award === 1 ? 'perle' : 'perles'} à l’abri !`;
    sound([523, 659, 784]);
    render();
    focus('[data-next]');
  }

  function win() {
    phase = 'won';
    sound([523, 659, 784, 1047]);
    render();
    focus('[data-start]');
  }

  function raft(crew, index) {
    return `<div role="group" class="lagoon-raft ${index === active ? 'current' : ''}" style="--crew:${crew.color}"
      aria-label="${crew.name}, ${crew.bank} perles, ${crew.tilt} tangages"${index === active ? ' aria-current="true"' : ''}>
      <div class="lagoon-token ${index === active && splashed ? 'splash' : ''}" style="--tilt:${crew.tilt * 8}deg" aria-hidden="true"><span>${portrait(crew)}</span></div>
      <strong>${crew.name}</strong>
      <span class="lagoon-bank" aria-hidden="true">◈ ${crew.bank}<small>/${lagoonGoal}</small></span>
      <div class="lagoon-waves" aria-hidden="true">${[0,1,2].map(n => `<span class="${n < crew.tilt ? 'rough' : ''}">≈</span>`).join('')}</div>
    </div>`;
  }

  function render() {
    const crew = fleet[active];
    if (phase === 'won') {
      stage.innerHTML = `<div class="lagoon-victory" style="--crew:${crew.color}">
        <div class="lagoon-victory-copy">
          <div class="lagoon-winner" aria-hidden="true">${portrait(crew)}</div>
          <h1>${crew.name} gagne !</h1>
          <p>${fullChest ? '✦ Cinq trésors différents dans le même tour !' : `◈ ${crew.bank} perles à l’abri`}</p>
          <div class="lagoon-actions">
            <button class="lagoon-action" data-start>↻ Rejouer</button>
            <button class="secondary" data-setup>Changer les joueurs</button>
          </div>
        </div>
      </div>`;
      return;
    }
    stage.innerHTML = `
      <div class="lagoon-table" data-phase="${phase}">
        <div class="lagoon-fleet" style="--players:${count}">${fleet.map(raft).join('')}</div>
        <div class="lagoon-dock">
          <div class="lagoon-turn" style="--crew:${crew.color}">${portrait(crew)} Tour de ${crew.name}</div>
          <div class="lagoon-hand" aria-label="Trésors du tour">${Array.from({length:5}, (_, i) => {
            const id = haul[i];
            const treasure = lagoonTreasures[id];
            return treasure ? `<div class="lagoon-card revealed ${i === haul.length - 1 ? 'fresh' : ''}" role="img" aria-label="${treasure}"><span class="lagoon-treasure" aria-hidden="true" style="--art-x:${(id % 3) * 50}%;--art-y:${id >= 3 ? 100 : 0}%"></span></div>` :
              '<div class="lagoon-card empty-card" aria-hidden="true">✧</div>';
          }).join('')}</div>
          <p class="lagoon-message" role="status">${message}</p>
          <div class="lagoon-actions">${phase === 'turn' ? `
            <button class="lagoon-action" data-draw ${haul.length >= 5 ? 'disabled' : ''}>▣ Piocher</button>
            <button class="lagoon-action bank" data-bank ${haul.length ? '' : 'disabled'}>◈ Encaisser${haul.length ? ' ' + haul.length : ''}</button>` :
            `<button class="lagoon-action" data-next>${portrait(fleet[(active + 1) % count])} Au suivant →</button>`}</div>
        </div>
      </div>`;
  }

  stage.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-count')) {
      count = Number(button.dataset.count);
      seat = Math.min(seat, count - 1);
      setup();
      focus(`[data-count="${count}"]`);
    } else if (button.hasAttribute('data-seat')) {
      seat = Number(button.dataset.seat);
      setup();
      focus(`[data-seat="${seat}"]`);
    } else if (button.hasAttribute('data-crew')) {
      const chosen = lagoonCrew[Number(button.dataset.crew)];
      const previous = lineup.indexOf(chosen);
      if (previous !== -1) lineup[previous] = lineup[seat];
      lineup[seat] = chosen;
      setup();
      focus(`[data-crew="${button.dataset.crew}"]`);
    } else if (button.hasAttribute('data-start')) start();
    else if (button.hasAttribute('data-setup')) {
      setup();
      focus('[data-start]');
    } else if (button.hasAttribute('data-draw')) draw();
    else if (button.hasAttribute('data-bank')) bank();
    else if (button.hasAttribute('data-next') && ['duplicate', 'banked'].includes(phase)) {
      active = (active + 1) % count;
      startTurn();
    }
  });

  app.querySelector('#lagoon-rules').onclick = () => rules.showModal();
  app.querySelector('#lagoon-sound').onclick = event => {
    muted = !muted;
    if (muted) audio?.suspend().catch(() => {});
    else audio?.resume().catch(() => {});
    event.currentTarget.setAttribute('aria-pressed', !muted);
    event.currentTarget.textContent = muted ? '🔇 Son' : '🔊 Son';
  };
  app.querySelector('#back').onclick = () => {
    audio?.close().catch(() => {});
    home('[data-detail="lagoon"]');
  };
  setup();
}
