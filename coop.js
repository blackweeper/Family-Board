const coopHens = [
  { name:'Plume', color:'#a2deff' },
  { name:'Noisette', color:'#ffce85' },
  { name:'Moka', color:'#f8a6ce' },
];
const coopModes = {
  little: { eggs:4, limit:10 },
  family: { eggs:5, limit:9 },
};
const coopWheel = ['egg','fox','egg','shield','egg','fox','egg','egg'];
const coopIcon = kind => `<img src="./covers/coop-${kind}.png" alt="" draggable="false">`;
const coopRules = `
  <h2>Comment jouer ?</h2>
  <ol>
    <li>Chacun appuie sur Tourner à son tour. Le nid à remplir s’allume automatiquement et la roue se tourne vers le joueur suivant après le résultat.</li>
    <li>🥚 <strong>Œuf</strong> : ajoute un œuf au nid choisi.</li>
    <li>🛡️ <strong>Protection</strong> : pose une protection sur le nid éclairé. Il ne peut en avoir qu’une à la fois.</li>
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
  let selected = 0;
  let wheelBag = [];
  let movedFox = false;
  let nestEffect = '';
  let nests = [];
  let fox = 0;
  let angle = 0;
  let result = '';
  let notice = '';
  let timer;
  let soundOn = true;
  let audio;
  const config = () => coopModes[mode];
  const goal = () => coopHens.length * config().eggs;
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
        <p>Faites tourner la roue et protégez les œufs ensemble.</p>
        <fieldset><legend>Joueurs</legend><div class="coop-options">
          ${[1,2,3,4].map(n => `<button data-count="${n}" aria-pressed="${count === n}">${n}</button>`).join('')}
        </div></fieldset>
        <fieldset><legend>Mode</legend><div class="coop-options">
          <button data-mode="little" aria-pressed="${mode === 'little'}">Petits</button>
          <button data-mode="family" aria-pressed="${mode === 'family'}">Famille</button>
        </div></fieldset>
        <p class="coop-mode">${goal()} œufs à mettre à l’abri</p>
        <button class="coop-primary" data-start>▶ Jouer</button>
      </div>
    </div>`;
  }

  function start() {
    player = 0;
    selected = 0;
    wheelBag = [];
    movedFox = false;
    nestEffect = '';
    nests = coopHens.map(() => ({eggs:0, shield:false}));
    fox = 0;
    angle = 0;
    result = '';
    notice = '';
    phase = 'ready';
    sound([392,523,659]);
    render();
    focus('[data-spin]');
  }

  function render() {
    const { eggs, limit } = config();
    const foxPosition = 86 - 49 * fox / limit;
    const angleBySeat = count === 2 ? [0,180] : [0,-90,180,90];
    rulesButton.disabled = phase !== 'ready';
    stage.innerHTML = `<div class="coop-board" data-phase="${phase}" data-seat="${player}" data-count="${count}" style="--seat-angle:${angleBySeat[player]}deg;--fox-step:${49 / limit}cqw">
      <div class="coop-hud">
        <strong class="coop-pill">${count === 1 ? 'Partie solo' : 'Joueur ' + (player + 1)}</strong>
        <strong class="coop-pill" aria-label="${total()} œufs sur ${goal()}">🥚 ${total()} / ${goal()}</strong>
        <div class="coop-track" aria-label="Renard : ${fox} pas sur ${limit}">
          ${coopIcon('fox')}${Array.from({length:limit},(_,i) => `<i class="${i < fox ? 'reached' : ''}"></i>`).join('')}
        </div>
      </div>
      <div class="coop-fox ${movedFox ? 'advancing' : ''}" style="--fox:${foxPosition}%" aria-hidden="true">${coopIcon('fox')}</div>
      <div class="coop-nests" aria-label="Les trois nids">
        ${nests.map((nest,i)=>`<div class="coop-nest ${nest.eggs === eggs ? 'full' : ''}" style="--capacity:${eggs}" data-nest="${i}"
          data-active="${i === selected}" data-effect="${i === selected ? nestEffect : ''}" role="group"
          aria-label="${coopHens[i].name}, ${nest.eggs} œufs sur ${eggs}${nest.shield ? ', protégé' : ''}">
          <span class="coop-eggs" aria-hidden="true">${Array.from({length:eggs},(_,n)=>`<span class="coop-egg ${n < nest.eggs ? 'filled' : ''} ${i === selected && nestEffect === 'egg' && n === nest.eggs - 1 ? 'new' : ''}">${coopIcon('egg')}</span>`).join('')}</span>
          ${nest.shield ? `<span class="coop-shield" aria-hidden="true">${coopIcon('shield')}</span>` : ''}
        </div>`).join('')}
      </div>
      <div class="coop-center">
        <div class="coop-wheel" role="img" aria-label="Roue : cinq œufs, une protection et deux renards">
          ${coopWheel.map((kind,i)=>`<span class="coop-sector ${kind}${phase === 'result' && angle % 360 === i * 45 ? ' landed' : ''}" style="--sector:${i * 45}deg" aria-hidden="true">${coopIcon(kind)}</span>`).join('')}
          <span class="coop-needle" style="--angle:${angle}deg" aria-hidden="true"></span>
        </div>
        <div class="coop-controls">
          <button class="coop-primary" data-spin ${phase !== 'ready' ? 'disabled' : ''}>↻ Tourner</button>
          <p class="coop-status" role="status">${phase === 'result' ? notice : ''}</p>
        </div>
      </div>
    </div>`;
  }

  function spin() {
    if (phase !== 'ready') return;
    if (!wheelBag.length) wheelBag = coopWheel.map((_, index) => index);
    const pick = Math.floor(Math.random() * wheelBag.length);
    const [slot] = wheelBag.splice(pick,1);
    result = coopWheel[slot];
    angle += 1080 + ((slot * 45 - angle % 360 + 360) % 360);
    phase = 'spinning';
    rulesButton.disabled = true;
    stage.querySelector('.coop-board').dataset.phase = phase;
    stage.querySelector('[data-spin]').disabled = true;
    stage.querySelector('.coop-needle').style.setProperty('--angle',angle+'deg');
    sound([392,440,523]);
    timer = setTimeout(resolveSpin,matchMedia('(prefers-reduced-motion: reduce)').matches ? 75 : 950);
  }

  function resolveSpin() {
    const nest = nests[selected];
    if (result === 'egg') {
      nest.eggs++;
      nestEffect = 'egg';
      notice = nest.eggs === config().eggs ? 'Nid rempli !' : 'Un œuf à l’abri !';
      sound([523,659,784]);
    } else if (result === 'shield') {
      nest.shield = true;
      nestEffect = 'shield';
      notice = 'Nid protégé !';
      sound([440,587,740]);
    } else if (nest.shield) {
      nest.shield = false;
      nestEffect = 'blocked';
      notice = 'Renard bloqué !';
      sound([440,587]);
    } else {
      fox++;
      movedFox = true;
      nestEffect = 'fox';
      const stolen = nest.eggs > 0;
      nest.eggs = Math.max(0,nest.eggs - 1);
      notice = stolen ? 'Un œuf volé !' : 'Le renard avance !';
      sound([330,247,196]);
    }
    phase = 'result';
    render();
    timer = setTimeout(advance,1100);
  }

  function advance() {
    if (total() === goal() || fox >= config().limit) {
      finish(fox < config().limit);
      return;
    }
    const previousWheel = stage.querySelector('.coop-center');
    const previousAngle = parseFloat(getComputedStyle(previousWheel).rotate) || 0;
    player = (player + 1) % count;
    for (let step = 1; step <= nests.length; step++) {
      const index = (selected + step) % nests.length;
      if (nests[index].eggs < config().eggs) {
        selected = index;
        break;
      }
    }
    phase = 'ready';
    movedFox = false;
    nestEffect = '';
    render();
    const wheel = stage.querySelector('.coop-center');
    const nextAngle = parseFloat(getComputedStyle(wheel).rotate) || 0;
    if (previousAngle !== nextAngle && !matchMedia('(prefers-reduced-motion: reduce)').matches && wheel.animate) {
      const offset = (previousAngle - nextAngle + 540) % 360 - 180;
      wheel.animate([{rotate:`${nextAngle + offset}deg`},{rotate:`${nextAngle}deg`}],{duration:310,easing:'ease-out'});
    }
    focus('[data-spin]');
  }

  function finish(won) {
    phase = 'finished';
    rulesButton.disabled = false;
    if (won) sound([523,659,784,1047]);
    stage.innerHTML = `<div class="coop-finish">
      <div class="coop-finale-art">${won ? coopHens.map((_,i)=>coopPortrait(i)).join('') : coopPortrait(3)}</div>
      <h1>${won ? 'Tous les nids sont remplis !' : 'Le renard a trouvé le poulailler !'}</h1>
      <p>${total()} / ${goal()} œufs à l’abri</p>
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
    } else if (button.hasAttribute('data-spin')) spin();
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
