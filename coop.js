const coopHens = [
  { name:'Plume', color:'#a2deff' },
  { name:'Noisette', color:'#ffce85' },
  { name:'Moka', color:'#f8a6ce' },
];
const coopModes = {
  little: { eggs:2, limit:6, wheel:['egg','egg','shield','egg','fox','egg'] },
  family: { eggs:3, limit:5, wheel:['egg','fox','egg','shield','egg','egg'] },
};
const coopSymbols = { egg:'🥚', shield:'🛡️', fox:'🦊' };
const coopRules = `
  <h2>Comment jouer ?</h2>
  <ol>
    <li>Chacun joue à son tour. Choisis un nid qui a encore une place, puis lance la girouette.</li>
    <li>🥚 <strong>Œuf</strong> : ajoute un œuf au nid choisi.</li>
    <li>🛡️ <strong>Protection</strong> : pose une protection sur ce nid. Il ne peut en avoir qu’une à la fois.</li>
    <li>🦊 <strong>Renard</strong> : si le nid est protégé, le bouclier disparaît et bloque le renard. Sinon, le renard avance et prend un œuf dans ce nid s’il y en a un.</li>
    <li>Remplissez les trois nids pour gagner ensemble. Si le renard atteint le poulailler avant, la partie est perdue.</li>
  </ol>`;

function coopPortrait(index) {
  return `<img src="./covers/coop-token-${index}.jpg" alt="" draggable="false">`;
}

function coopGame() {
  let count = 2;
  let mode = 'little';
  let player = 0;
  let phase = 'setup';
  let selected = -1;
  let nests = [];
  let fox = 0;
  let angle = 0;
  let result = '';
  let notice = '';
  let timer;
  let soundOn = true;
  let audio;
  const config = () => coopModes[mode];
  const total = () => nests.reduce((sum,nest) => sum + nest.eggs,0);

  app.innerHTML = `<section class="coop">
    <div class="coop-bar">
      <button class="secondary" id="back">← Jeux</button>
      <button class="secondary" id="coop-sound" aria-pressed="true">🔊 Son</button>
      <button class="secondary" id="coop-rules">? Règles</button>
    </div>
    <div id="coop-stage"></div>
    <dialog class="coop-rules" aria-label="Règles de La Ronde du Poulailler">
      ${coopRules}<form method="dialog"><button class="primary">Compris !</button></form>
    </dialog>
  </section>`;
  const stage = app.querySelector('#coop-stage');
  const rules = app.querySelector('.coop-rules');
  const rulesButton = app.querySelector('#coop-rules');
  const focus = selector => stage.querySelector(selector)?.focus({preventScroll:true});

  function sound(notes) {
    if (!soundOn || !window.AudioContext) return;
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    notes.forEach((pitch,index) => {
      const start = audio.currentTime + index * .073;
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.type = 'sine';
      tone.frequency.value = pitch;
      gain.gain.setValueAtTime(.001,start);
      gain.gain.exponentialRampToValueAtTime(.095,start + .018);
      gain.gain.exponentialRampToValueAtTime(.001,start + .2);
      tone.connect(gain).connect(audio.destination);
      tone.start(start);
      tone.stop(start + .21);
    });
  }

  function setup() {
    phase = 'setup';
    stage.innerHTML = `<div class="coop-intro">
      <div class="coop-intro-copy">
        <h1>La Ronde du<br>Poulailler</h1>
        <p>Tournez la girouette et protégez les œufs ensemble.</p>
        <fieldset><legend>Joueurs</legend><div class="coop-options">
          ${[1,2,3,4].map(n => `<button data-count="${n}" aria-pressed="${count === n}">${n}</button>`).join('')}
        </div></fieldset>
        <fieldset><legend>Mode</legend><div class="coop-options">
          <button data-mode="little" aria-pressed="${mode === 'little'}">Petits</button>
          <button data-mode="family" aria-pressed="${mode === 'family'}">Famille</button>
        </div></fieldset>
        <p class="coop-mode">${3*config().eggs} œufs à mettre à l’abri</p>
        <button class="coop-primary" data-start>▶ Jouer</button>
      </div>
    </div>`;
  }

  function start() {
    player = 0;
    selected = -1;
    nests = coopHens.map(() => ({eggs:0, shield:false}));
    fox = 0;
    angle = 0;
    result = '';
    notice = '';
    phase = 'choose';
    sound([392,523,659]);
    render();
    focus('[data-nest]:enabled');
  }

  function render() {
    const {eggs,limit,wheel} = config();
    rulesButton.disabled = phase === 'spinning';
    stage.innerHTML = `<div class="coop-board" data-phase="${phase}">
      <div class="coop-hud">
        <strong class="coop-pill">${count === 1 ? 'Partie solo' : '● Joueur ' + (player + 1)}</strong>
        <strong class="coop-pill" aria-label="${total()} œufs sur ${eggs*3}">🥚 ${total()} / ${eggs*3}</strong>
        <div class="coop-track" aria-label="Renard : ${fox} pas sur ${limit}">
          ${coopPortrait(3)}${Array.from({length:limit},(_,i) => `<i class="${i < fox ? 'reached' : ''}"></i>`).join('')}<span aria-hidden="true">⌂</span>
        </div>
      </div>
      <div class="coop-center">
        <div class="coop-wheel" role="img" aria-label="Girouette : quatre cases œuf, une protection, une case renard">
          ${wheel.map((kind,i)=>`<span class="coop-sector ${kind}" style="--sector:${i*60}deg" aria-hidden="true"><b>${coopSymbols[kind]}</b></span>`).join('')}
          <span class="coop-needle" style="--angle:${angle}deg" aria-hidden="true"></span>
        </div>
        <div class="coop-controls">
          <p class="coop-status" role="status">${phase === 'result' ? notice : selected < 0 ? 'Choisis un nid.' : 'Prêt à lancer la girouette !'}</p>
          ${phase === 'result' ? `<button class="coop-primary" data-next>${count === 1 ? 'Continuer →' : 'Au suivant →'}</button>` : `<button class="coop-primary" data-spin ${selected < 0 ? 'disabled' : ''}>↻ Tourner</button>`}
        </div>
      </div>
      <div class="coop-nests" aria-label="Les trois nids">
        ${nests.map((nest,i)=>`<button class="coop-nest ${nest.eggs === eggs ? 'full' : ''}" style="--hen:${coopHens[i].color}" data-nest="${i}"
          aria-pressed="${i === selected}" aria-label="${coopHens[i].name}, ${nest.eggs} œufs sur ${eggs}${nest.shield ? ', protégé' : ''}"
          ${phase !== 'choose' || nest.eggs === eggs ? 'disabled' : ''}>
          ${coopPortrait(i)}<strong>${coopHens[i].name}</strong>
          <span class="coop-eggs" aria-hidden="true">${Array.from({length:eggs},(_,n)=>`<i class="${n < nest.eggs ? 'filled' : ''}"></i>`).join('')}</span>
          <span class="coop-shield" aria-hidden="true">${nest.shield ? '🛡️' : ''}</span>
        </button>`).join('')}
      </div>
    </div>`;
  }

  function spin() {
    if (selected < 0 || phase !== 'choose') return;
    const wheel = config().wheel;
    const slot = Math.floor(Math.random() * wheel.length);
    result = wheel[slot];
    angle += 1080 + ((slot*60 - angle % 360 + 360) % 360);
    phase = 'spinning';
    rulesButton.disabled = true;
    stage.querySelector('.coop-board').dataset.phase = phase;
    stage.querySelector('.coop-status').textContent = 'La girouette tourne…';
    stage.querySelector('[data-spin]').disabled = true;
    stage.querySelectorAll('[data-nest]').forEach(button => {button.disabled = true});
    stage.querySelector('.coop-needle').style.setProperty('--angle',angle+'deg');
    sound([392,440,523]);
    timer = setTimeout(resolveSpin,matchMedia('(prefers-reduced-motion: reduce)').matches ? 75 : 950);
  }

  function resolveSpin() {
    const nest = nests[selected];
    if (result === 'egg') {
      nest.eggs++;
      notice = 'Un œuf pour ' + coopHens[selected].name + ' !';
      sound([523,659,784]);
    } else if (result === 'shield') {
      notice = nest.shield ? 'Ce nid garde son bouclier.' : 'Ce nid est protégé !';
      nest.shield = true;
      sound([440,587,740]);
    } else if (nest.shield) {
      nest.shield = false;
      notice = 'Le bouclier a arrêté le renard !';
      sound([440,587]);
    } else {
      fox++;
      const stolen = nest.eggs > 0;
      nest.eggs = Math.max(0,nest.eggs-1);
      notice = stolen ? 'Le renard avance et emporte un œuf !' : 'Le renard avance. Le nid était vide.';
      sound([330,247,196]);
    }
    if (total() === config().eggs*3 || fox === config().limit) {
      finish(fox < config().limit);
      return;
    }
    phase = 'result';
    render();
    focus('[data-next]');
  }

  function finish(won) {
    phase = 'finished';
    rulesButton.disabled = false;
    if (won) sound([523,659,784,1047]);
    stage.innerHTML = `<div class="coop-finish">
      <div class="coop-finale-art">${won ? coopHens.map((_,i)=>coopPortrait(i)).join('') : coopPortrait(3)}</div>
      <h1>${won ? 'Tous les nids sont remplis !' : 'Le renard a trouvé le poulailler !'}</h1>
      <p>${total()} / ${config().eggs*3} œufs à l’abri</p>
      <div class="coop-options"><button class="coop-primary" data-start>↻ Rejouer</button><button class="secondary" data-setup>Réglages</button></div>
    </div>`;
    focus('[data-start]');
  }

  stage.addEventListener('click',event => {
    const button = event.target.closest('button');
    if (!button || button.disabled || rules.open) return;
    if (button.hasAttribute('data-start')) start();
    else if (button.hasAttribute('data-setup')) {
      setup();
      focus('[data-start]');
    } else if (button.dataset.count || button.dataset.mode) {
      if (button.dataset.count) count = Number(button.dataset.count);
      if (button.dataset.mode) mode = button.dataset.mode;
      setup();
      focus(button.dataset.count ? `[data-count="${count}"]` : `[data-mode="${mode}"]`);
    } else if (phase === 'choose' && button.hasAttribute('data-nest')) {
      selected = Number(button.dataset.nest);
      render();
      focus('[data-spin]');
    } else if (button.hasAttribute('data-spin')) spin();
    else if (phase === 'result' && button.hasAttribute('data-next')) {
      player = (player+1) % count;
      selected = -1;
      phase = 'choose';
      render();
      focus('[data-nest]:enabled');
    }
  });

  rulesButton.onclick = () => rules.showModal();
  app.querySelector('#coop-sound').onclick = event => {
    soundOn = !soundOn;
    if (soundOn) audio?.resume().catch(() => {});
    else audio?.suspend().catch(() => {});
    event.currentTarget.textContent = soundOn ? '🔊 Son' : '🔇 Son';
    event.currentTarget.setAttribute('aria-pressed',soundOn);
  };
  app.querySelector('#back').onclick = () => {
    clearTimeout(timer);
    audio?.close().catch(() => {});
    home('[data-detail="coop"]');
  };
  setup();
}
