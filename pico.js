const picoEggs = [
  { name:'Menthe', symbol:'◆', color:'#83f2c3' },
  { name:'Soleil', symbol:'☀', color:'#ffde75' },
  { name:'Prune', symbol:'✦', color:'#d6a8ff' },
];
const picoModes = {
  little: { goal:6, limit:5, speed:1850, left:29, right:71, name:'Petits' },
  family: { goal:9, limit:4, speed:1280, left:33, right:67, name:'Famille' },
};
const picoRules = `
  <h2>Comment jouer ?</h2>
  <ol>
    <li>Jouez chacun à votre tour. Choisis un œuf dans le nid.</li>
    <li>Sur la jauge, attends que le curseur soit dans la zone verte, puis touche <strong>Glisser</strong>. Pico descend la cascade avec l’œuf !</li>
    <li>Si l’œuf arrive entier, touche une cachette avec le même symbole pour le mettre à l’abri.</li>
    <li>Si l’œuf se fissure, la loutre avance d’un pas. Elle repart d’un pas en arrière quand vous sauvez les trois couleurs d’une rangée.</li>
    <li>Gagnez ensemble en remplissant les cachettes avant que la loutre n’atteigne le nid.</li>
  </ol>`;

function picoEgg(index) {
  const egg = picoEggs[index];
  return `<span class="pico-egg" style="--egg:${egg.color}" aria-hidden="true">${egg.symbol}</span>`;
}

function picoGame() {
  let playerCount = 2;
  let mode = 'little';
  let player = 0;
  let phase = 'setup';
  let saved = [0,0,0];
  let threat = 0;
  let selected = -1;
  let timer;
  let meterFrame;
  let meterTime = 0;
  let lastFrame;
  let position = 50;
  let muted = false;
  let audio;
  let outcome = '';
  let notice = '';
  const colors = ['#ffd38d','#a9efde','#d5b4ff','#ffa8a4'];

  app.innerHTML = `<section class="pico">
    <div class="pico-bar">
      <button class="secondary" id="back">← Jeux</button>
      <button class="secondary" id="pico-sound" aria-pressed="true">🔊 Son</button>
      <button class="secondary" id="pico-rules">? Règles</button>
    </div>
    <div id="pico-stage"></div>
    <dialog class="pico-rules" aria-label="Règles de Pico et la Cascade">
      ${picoRules}<form method="dialog"><button class="primary">Compris !</button></form>
    </dialog>
  </section>`;
  const stage = app.querySelector('#pico-stage');
  const rules = app.querySelector('.pico-rules');
  const config = () => picoModes[mode];
  const total = () => saved.reduce((sum, eggs) => sum + eggs, 0);
  const focus = selector => stage.querySelector(selector)?.focus({ preventScroll:true });
  const actor = () => `<div class="pico-bird"><img src="./covers/pico-token.png" alt="Pico sur sa feuille" draggable="false">${selected >= 0 ? picoEgg(selected) : ''}</div>`;

  function sound(notes) {
    if (muted || !window.AudioContext) return;
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    notes.forEach((pitch, i) => {
      const start = audio.currentTime + i * .075;
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.type = 'sine';
      tone.frequency.value = pitch;
      gain.gain.setValueAtTime(.001, start);
      gain.gain.exponentialRampToValueAtTime(.09, start + .018);
      gain.gain.exponentialRampToValueAtTime(.001, start + .22);
      tone.connect(gain).connect(audio.destination);
      tone.start(start);
      tone.stop(start + .23);
    });
  }

  function setup() {
    phase = 'setup';
    stage.innerHTML = `<div class="pico-intro">
      <div class="pico-intro-copy">
        <h1>Pico et la<br>Cascade</h1>
        <p>Glissez ensemble au secours des œufs.</p>
        <fieldset><legend>Joueurs</legend><div class="pico-choices">
          ${[2,3,4].map(n => `<button data-count="${n}" aria-pressed="${playerCount === n}">${n}</button>`).join('')}
        </div></fieldset>
        <fieldset><legend>Mode</legend><div class="pico-choices">
          ${Object.entries(picoModes).map(([id, settings]) => `<button data-mode="${id}" aria-pressed="${mode === id}">${settings.name}</button>`).join('')}
        </div></fieldset>
        <p class="pico-mode">${config().goal} œufs à sauver · ${mode === 'little' ? 'Glissade tranquille' : 'Glissade plus rapide'}</p>
        <button class="pico-action" data-start>▶ Jouer</button>
      </div>
    </div>`;
  }

  function start() {
    saved = [0,0,0];
    threat = 0;
    player = 0;
    selected = -1;
    phase = 'choose';
    outcome = '';
    notice = '';
    sound([392, 523, 659]);
    render();
    focus('[data-egg]:enabled');
  }

  function meter() {
    const { left, right } = config();
    return `<div class="pico-meter" role="img" aria-label="Zone verte au centre de la jauge" style="--left:${left}%;--width:${right-left}%"><span></span><i></i></div>`;
  }

  function render() {
    app.querySelector('#pico-rules').disabled = phase === 'slide';
    const { goal, limit } = config();
    const active = phase === 'choose' || phase === 'aim';
    const stageText = {
      choose: notice || 'Choisis un œuf.',
      aim: 'Appuie quand le curseur est dans le vert.',
      slide: 'Pico descend la cascade !',
      place: 'Œuf intact ! Choisis la cachette du même symbole.',
      miss: 'Oups, l’œuf est fissuré. La loutre avance !',
    };
    stage.innerHTML = `<div class="pico-table" data-phase="${phase}" data-outcome="${outcome}">
      <div class="pico-hud">
        <div class="pico-turn" style="--player:${colors[player]}">● Joueur ${player + 1}</div>
        <div class="pico-progress" aria-label="${total()} œufs sauvés sur ${goal}">🥚 ${total()} / ${goal}</div>
        <div class="pico-threat" aria-label="La loutre est à ${limit-threat} pas du nid">
          <span aria-hidden="true">🦦</span>${Array.from({length:limit},(_,i)=>`<i class="${i < threat ? 'filled' : ''}"></i>`).join('')}<span aria-hidden="true">🪺</span>
        </div>
      </div>
      <div class="pico-stream">${actor()}</div>
      <div class="pico-dock">
        <p class="pico-status" role="status">${stageText[phase]}</p>
        ${phase === 'aim' ? meter() : ''}
        <div class="pico-tools">
          ${active ? (phase === 'choose' ? picoEggs.map((egg,i)=>`<button class="pico-choice" data-egg="${i}" aria-label="Œuf ${egg.name}" ${saved[i] >= goal/3 ? 'disabled' : ''}>${picoEgg(i)}</button>`).join('') :
            '<button class="secondary" data-cancel>↶ Changer d’œuf</button><button class="pico-action" data-slide>➜ Glisser</button>') : ''}
          ${phase === 'miss' ? '<button class="pico-action" data-next>Au suivant →</button>' : ''}
        </div>
        <div class="pico-nests" aria-label="Cachettes">
          ${picoEggs.map((egg,i)=>`<button class="pico-nest" data-nest="${i}" style="--egg:${egg.color}" aria-label="Cachette ${egg.name}, ${saved[i]} sur ${goal/3}" ${phase !== 'place' || saved[i] >= goal/3 ? 'disabled' : ''}>
            <b aria-hidden="true">${egg.symbol}</b><span aria-hidden="true">${Array.from({length:goal/3},(_,slot)=>`<i class="${slot < saved[i] ? 'filled' : ''}">${slot < saved[i] ? egg.symbol : ''}</i>`).join('')}</span>
          </button>`).join('')}
        </div>
      </div>
    </div>`;
  }

  function animateMeter(timestamp) {
    if (phase !== 'aim' || rules.open || !stage.isConnected) return;
    if (lastFrame !== undefined) meterTime += Math.min(48, timestamp - lastFrame);
    lastFrame = timestamp;
    const cycle = (meterTime / config().speed) % 2;
    position = 100 * (cycle <= 1 ? cycle : 2 - cycle);
    stage.querySelector('.pico-meter i').style.left = position + '%';
    meterFrame = requestAnimationFrame(animateMeter);
  }

  function aim(index) {
    selected = index;
    phase = 'aim';
    meterTime = 0;
    position = 0;
    lastFrame = undefined;
    render();
    meterFrame = requestAnimationFrame(animateMeter);
    focus('[data-slide]');
  }

  function slide() {
    cancelAnimationFrame(meterFrame);
    const { left, right } = config();
    outcome = position >= left && position <= right ? 'safe' : 'crack';
    phase = 'slide';
    sound([392, 440, 523]);
    render();
    timer = setTimeout(resolveSlide, matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 790);
  }

  function resolveSlide() {
    if (outcome === 'safe') {
      phase = 'place';
      sound([523, 659, 784]);
      render();
      focus('[data-nest]:enabled');
    } else {
      threat++;
      sound([330, 247, 196]);
      if (threat >= config().limit) finish(false);
      else {
        phase = 'miss';
        render();
        focus('[data-next]');
      }
    }
  }

  function shelter(index) {
    if (index !== selected) {
      sound([294, 220]);
      stage.querySelector('.pico-status').textContent = 'Cherche la cachette avec le même symbole.';
      return;
    }
    const before = Math.min(...saved);
    saved[index]++;
    const complete = Math.min(...saved) > before;
    if (complete) threat = Math.max(0, threat - 1);
    if (total() === config().goal) {
      finish(true);
      return;
    }
    sound(complete ? [523, 659, 784, 1047] : [523, 659]);
    next(complete ? 'Rangée complète ! La loutre recule si elle avait avancé.' : 'Œuf sauvé ! À toi de choisir.');
  }

  function next(text = '') {
    player = (player + 1) % playerCount;
    selected = -1;
    outcome = '';
    phase = 'choose';
    notice = text;
    render();
    focus('[data-egg]:enabled');
  }

  function finish(won) {
    phase = 'finished';
    app.querySelector('#pico-rules').disabled = false;
    if (won) sound([523, 659, 784, 1047]);
    stage.innerHTML = `<div class="pico-finish">
      <img src="./covers/pico-token.png" alt="" draggable="false">
      <h1>${won ? 'Tous les œufs sont sauvés !' : 'La loutre a trouvé le nid !'}</h1>
      <p>${total()} / ${config().goal} œufs à l’abri</p>
      <div class="pico-choices"><button class="pico-action" data-start>↻ Rejouer</button><button class="secondary" data-setup>Réglages</button></div>
    </div>`;
    focus('[data-start]');
  }

  stage.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || rules.open || button.disabled) return;
    if (button.hasAttribute('data-start')) start();
    else if (button.hasAttribute('data-setup')) {
      setup();
      focus('[data-start]');
    } else if (button.dataset.count || button.dataset.mode) {
      if (button.dataset.count) playerCount = Number(button.dataset.count);
      if (button.dataset.mode) mode = button.dataset.mode;
      setup();
      focus(button.dataset.count ? `[data-count="${playerCount}"]` : `[data-mode="${mode}"]`);
    } else if (phase === 'choose' && button.hasAttribute('data-egg')) aim(Number(button.dataset.egg));
    else if (phase === 'aim' && button.hasAttribute('data-cancel')) {
      cancelAnimationFrame(meterFrame);
      phase = 'choose';
      selected = -1;
      render();
      focus('[data-egg]:enabled');
    } else if (phase === 'aim' && button.hasAttribute('data-slide')) slide();
    else if (phase === 'place' && button.hasAttribute('data-nest')) shelter(Number(button.dataset.nest));
    else if (phase === 'miss' && button.hasAttribute('data-next')) next();
  });

  app.querySelector('#pico-rules').onclick = () => {
    if (phase === 'slide') return;
    cancelAnimationFrame(meterFrame);
    rules.showModal();
  };
  rules.addEventListener('close', () => {
    if (phase === 'aim' && stage.isConnected) {
      lastFrame = undefined;
      meterFrame = requestAnimationFrame(animateMeter);
    }
  });
  app.querySelector('#pico-sound').onclick = event => {
    muted = !muted;
    if (muted) audio?.suspend().catch(() => {});
    else audio?.resume().catch(() => {});
    event.currentTarget.textContent = muted ? '🔇 Son' : '🔊 Son';
    event.currentTarget.setAttribute('aria-pressed', !muted);
  };
  app.querySelector('#back').onclick = () => {
    clearTimeout(timer);
    cancelAnimationFrame(meterFrame);
    audio?.close().catch(() => {});
    home('[data-detail="pico"]');
  };
  setup();
}
