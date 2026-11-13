const picoEggs = ['Azur', 'Soleil', 'Prune', 'Menthe'];
const picoModes = {
  little: { cards:3, limit:5, speed:1160, width:22, name:'Petits' },
  family: { cards:4, limit:4, speed:910, width:17, name:'Famille' },
};
const picoRecipes = [
  [0,0,1], [1,1,2], [2,2,3], [3,3,0],
  [0,2,2], [1,3,3], [0,1,3], [1,2,3],
];
const picoRules = `
  <h2>Comment jouer ?</h2>
  <ol>
    <li>Jouez chacun à votre tour. Choisis un œuf dans le nid.</li>
    <li>Sur la jauge, attends que le curseur soit dans la zone verte, puis touche <strong>Glisser</strong>. Pico descend la cascade avec l’œuf !</li>
    <li>Un œuf intact rejoint automatiquement une carte-cachette de son motif. Si aucune cachette n’attend ce motif, la main passe au joueur suivant. À chaque œuf sauvé, la zone verte rétrécit et le curseur accélère.</li>
    <li>Si l’œuf se fissure, la loutre l’emporte et avance vers le nid. Chaque cachette complétée fait reculer la loutre.</li>
    <li>Gagnez ensemble en remplissant toutes les cartes-cachettes avant que la loutre n’atteigne le nid.</li>
  </ol>`;

function picoEgg(index) {
  return `<span class="pico-egg" aria-hidden="true"><img src="./covers/pico-egg-${index}.png" alt="" draggable="false"></span>`;
}

function picoGame() {
  let playerCount = 2;
  let mode = 'little';
  let player = 0;
  let phase = 'setup';
  let shelters = [];
  let filledCard = -1;
  let filledSlot = -1;
  let threat = 0;
  let selected = -1;
  let timer;
  let meterFrame;
  let meterTime = 0;
  let lastFrame;
  let position = 0;
  let targetLeft = 0;
  let targetWidth = 0;
  let meterSpeed = 0;
  let audioBed;
  let musicTimer;
  let musicBeat = 0;
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
  const goal = () => config().cards * 3;
  const total = () => shelters.reduce((sum, card) => sum + card.slots.filter(slot => slot.filled).length, 0);
  const needs = (card, egg) => card.slots.some(slot => !slot.filled && slot.egg === egg);

  function dealShelters() {
    const recipes = [...picoRecipes];
    for (let i = recipes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [recipes[i], recipes[j]] = [recipes[j], recipes[i]];
    }
    return recipes.slice(0, config().cards).map(recipe => ({
      slots: recipe.map(egg => ({egg, filled:false})),
    }));
  }
  const focus = selector => stage.querySelector(selector)?.focus({ preventScroll:true });
  const actor = () => `<div class="pico-bird"><img src="./covers/pico-token.png" alt="Pico sur sa feuille" draggable="false">${selected >= 0 ? picoEgg(selected) : ''}</div>`;

  function startAmbience() {
    if (muted || !window.AudioContext || audioBed) return;
    audio ??= new AudioContext();
    audio.resume().catch(() => {});
    const buffer = audio.createBuffer(1, audio.sampleRate * 3, audio.sampleRate);
    const samples = buffer.getChannelData(0);
    let drift = 0;
    for (let i = 0; i < samples.length; i++) {
      drift = .88 * drift + .12 * (Math.random() * 2 - 1);
      samples[i] = drift;
    }
    const water = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    water.buffer = buffer;
    water.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = 680;
    filter.Q.value = .5;
    gain.gain.value = .20;
    water.connect(filter).connect(gain).connect(audio.destination);
    water.start();
    audioBed = { water, filter, gain };
    const theme = [196, 0, 294, 262, 0, 311, 220, 0, 330, 294, 0, 262];
    musicTimer = setInterval(() => {
      const pitch = theme[musicBeat++ % theme.length];
      if (pitch && audio.state === 'running') sound([pitch], .052, .55, 'triangle');
    }, 430);
  }

  function stopAmbience() {
    clearInterval(musicTimer);
    if (audioBed) {
      audioBed.water.stop();
      audioBed.water.disconnect();
      audioBed.filter.disconnect();
      audioBed.gain.disconnect();
      audioBed = undefined;
    }
  }

  function sound(notes, volume = .09, duration = .22, type = 'sine') {
    if (muted || !window.AudioContext) return;
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    notes.forEach((pitch, i) => {
      const start = audio.currentTime + i * .075;
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.type = type;
      tone.frequency.value = pitch;
      gain.gain.setValueAtTime(.001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + .018);
      gain.gain.exponentialRampToValueAtTime(.001, start + duration);
      tone.connect(gain).connect(audio.destination);
      tone.start(start);
      tone.stop(start + duration + .01);
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
        <p class="pico-mode">${config().cards} cartes-cachettes · ${goal()} œufs · ${mode === 'little' ? 'Glissade tranquille' : 'Glissade plus rapide'}</p>
        <button class="pico-action" data-start>▶ Jouer</button>
      </div>
    </div>`;
  }

  function start() {
    shelters = dealShelters();
    filledCard = -1;
    filledSlot = -1;
    threat = 0;
    player = 0;
    selected = -1;
    phase = 'choose';
    outcome = '';
    notice = '';
    musicBeat = 0;
    startAmbience();
    sound([392, 523, 659]);
    render();
    focus('[data-egg]:enabled');
  }

  function meter() {
    return `<div class="pico-meter" role="img" aria-label="Arrête le curseur dans la zone verte" style="--left:${targetLeft}%;--width:${targetWidth}%"><span></span><i></i></div>`;
  }

  function render() {
    app.querySelector('#pico-rules').disabled = ['slide','place','saved','steal','miss'].includes(phase);
    const { limit } = config();
    const active = phase === 'choose' || phase === 'aim';
    const stageText = {
      choose: '',
      aim: 'Appuie quand le curseur est dans le vert.',
      slide: 'Pico descend la cascade !',
      place: 'Œuf intact ! Il rejoint sa cachette.',
      saved: notice,
      steal: 'Attention, la loutre attrape l’œuf !',
      miss: 'La loutre emporte l’œuf fissuré !',
    };
    stage.innerHTML = `<div class="pico-table" data-phase="${phase}" data-outcome="${outcome}" data-seat="${player}" style="--otter:${96 - 45 * threat / limit}%;--otter-step:${45 / limit}cqw">
      <div class="pico-hud">
        <div class="pico-turn" style="--player:${colors[player]}">● Joueur ${player + 1}</div>
        <div class="pico-progress" aria-label="${total()} œufs sauvés sur ${goal()}">🥚 ${total()} / ${goal()}</div>
        <div class="pico-threat" aria-label="La loutre est à ${limit-threat} pas du nid">
          <span aria-hidden="true">🦦</span>${Array.from({length:limit},(_,i)=>`<i class="${i < threat ? 'filled' : ''}"></i>`).join('')}<span aria-hidden="true">🪺</span>
        </div>
      </div>
      <div class="pico-stream">
        ${actor()}<span class="pico-splash" aria-hidden="true"></span>
        <div class="pico-otter"><img src="./covers/pico-otter.png" alt="La loutre" draggable="false">${phase === 'steal' || phase === 'miss' ? picoEgg(selected) : ''}</div>
      </div>
      <div class="pico-dock">
        ${stageText[phase] ? `<p class="pico-status" role="status">${stageText[phase]}</p>` : ''}
        ${phase === 'aim' ? meter() : ''}
        <div class="pico-tools">
          ${active ? (phase === 'choose' ? picoEggs.map((name,i)=>`<button class="pico-choice" data-egg="${i}" aria-label="Œuf ${name}" >${picoEgg(i)}</button>`).join('') :
            '<button class="pico-action" data-slide>➜ Glisser</button>') : ''}
        </div>
      </div>
      <div class="pico-nests" aria-label="Cartes-cachettes">
        ${shelters.map((card,i) => `<div class="pico-nest ${card.slots.every(slot=>slot.filled) ? 'complete' : ''}" role="group"
          aria-label="Cachette ${i+1} : ${card.slots.map(slot=>picoEggs[slot.egg] + (slot.filled ? ' sauvé' : ' attendu')).join(', ')}">
          <span class="pico-recipe" aria-hidden="true">${card.slots.map((slot,j)=>`<span class="pico-slot ${slot.filled ? 'filled' : ''} ${filledCard === i && filledSlot === j ? 'just-saved' : ''}" data-slot="${i}-${j}">${picoEgg(slot.egg)}</span>`).join('')}</span>
        </div>`).join('')}
      </div>
    </div>`;
  }

  function animateMeter(timestamp) {
    if (phase !== 'aim' || rules.open || !stage.isConnected) return;
    if (lastFrame !== undefined) meterTime += Math.min(48, timestamp - lastFrame);
    lastFrame = timestamp;
    const cycle = (meterTime / meterSpeed) % 2;
    position = 100 * (cycle <= 1 ? cycle : 2 - cycle);
    stage.querySelector('.pico-meter i').style.left = position + '%';
    meterFrame = requestAnimationFrame(animateMeter);
  }

  function aim(index) {
    selected = index;
    phase = 'aim';
    meterTime = 0;
    position = 0;
    const progress = total() / (goal() - 1);
    targetWidth = config().width * (1 - .52 * progress);
    meterSpeed = config().speed * (1 - .38 * progress);
    targetLeft = 14 + Math.random() * (72 - targetWidth);
    lastFrame = undefined;
    render();
    meterFrame = requestAnimationFrame(animateMeter);
    focus('[data-slide]');
  }

  function slide() {
    cancelAnimationFrame(meterFrame);
    outcome = position >= targetLeft && position <= targetLeft + targetWidth ? 'safe' : 'crack';
    phase = 'slide';
    sound([392, 440, 523]);
    render();
    timer = setTimeout(resolveSlide, matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 790);
  }

  function resolveSlide() {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (outcome === 'safe') {
      const index = shelters.findIndex(card => needs(card, selected));
      if (index === -1) {
        next();
        return;
      }
      phase = 'place';
      render();
      const slot = shelters[index].slots.findIndex(item => !item.filled && item.egg === selected);
      flyEgg(stage.querySelector(`[data-slot="${index}-${slot}"] .pico-egg`), reduced ? 0 : 500);
      timer = setTimeout(() => shelter(index, slot), reduced ? 0 : 500);
    } else {
      threat++;
      phase = 'steal';
      sound([330, 247, 196]);
      render();
      flyEgg(stage.querySelector('.pico-otter > .pico-egg'), reduced ? 0 : 430);
      timer = setTimeout(() => {
        phase = 'miss';
        render();
        timer = setTimeout(threat >= config().limit ? () => finish(false) : next, 800);
      }, reduced ? 0 : 640);
    }
  }

  function flyEgg(target, duration) {
    if (!duration || !target.animate) return;
    const source = stage.querySelector('.pico-bird > .pico-egg');
    const from = source.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const dx = to.x + to.width / 2 - from.x - from.width / 2;
    const dy = to.y + to.height / 2 - from.y - from.height / 2;
    source.classList.add('pico-flying');
    source.animate([
      { transform:'translate(0,0) rotate(0)' },
      { transform:`translate(${dx/2}px,${dy/2-40}px) rotate(22deg)` },
      { transform:`translate(${dx}px,${dy}px) rotate(0) scale(${to.width/from.width})` },
    ], {duration, easing:'ease-in-out', fill:'forwards'});
  }

  function shelter(index, slot) {
    const card = shelters[index];
    card.slots[slot].filled = true;
    filledCard = index;
    filledSlot = slot;
    const complete = card.slots.every(item => item.filled);
    const retreats = complete && threat > 0;
    if (retreats) threat--;
    notice = retreats ? 'Cachette complète ! La loutre recule.' : complete ? 'Cachette complète !' : 'Œuf sauvé !';
    phase = 'saved';
    sound(complete ? [523, 659, 784, 1047] : [523, 659]);
    render();
    timer = setTimeout(() => {
      if (total() === goal()) finish(true);
      else next();
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 80 : 680);
  }

  function next() {
    player = (player + 1) % playerCount;
    selected = -1;
    outcome = '';
    phase = 'choose';
    notice = '';
    filledCard = -1;
    filledSlot = -1;
    render();
    focus('[data-egg]:enabled');
  }

  function finish(won) {
    phase = 'finished';
    stopAmbience();
    app.querySelector('#pico-rules').disabled = false;
    if (won) sound([523, 659, 784, 1047]);
    stage.innerHTML = `<div class="pico-finish">
      <img src="./covers/pico-${won ? 'token' : 'otter'}.png" alt="" draggable="false">
      <h1>${won ? 'Tous les œufs sont sauvés !' : 'La loutre a trouvé le nid !'}</h1>
      <p>${total()} / ${goal()} œufs à l’abri</p>
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
    else if (phase === 'aim' && button.hasAttribute('data-slide')) slide();
  });

  app.querySelector('#pico-rules').onclick = () => {
    if (app.querySelector('#pico-rules').disabled) return;
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
    if (muted) {
      stopAmbience();
      audio?.suspend().catch(() => {});
    } else {
      audio?.resume().catch(() => {});
      if (!['setup','finished'].includes(phase)) startAmbience();
    }
    event.currentTarget.textContent = muted ? '🔇 Son' : '🔊 Son';
    event.currentTarget.setAttribute('aria-pressed', !muted);
  };
  app.querySelector('#back').onclick = () => {
    clearTimeout(timer);
    cancelAnimationFrame(meterFrame);
    stopAmbience();
    audio?.close().catch(() => {});
    home('[data-detail="pico"]');
  };
  setup();
}
