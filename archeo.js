const archeoRules = `
  <h2>À vos pelles !</h2>
  <ol>
    <li>La dernière personne à avoir creusé un trou commence. À tour de rôle, touchez une tuile dégagée. Il faut retirer tout ce qui la recouvre avant de pouvoir la soulever.</li>
    <li>Les fragments rejoignent leurs fossiles. Les petits os sur certaines tuiles signalent un fossile en dessous.</li>
    <li>La brouette appartient au joueur qui la trouve. Face aux cailloux, utilisez une de vos brouettes ou perdez une pelle par caillou. Chaque marteau répare une pelle.</li>
    <li>Avec la loupe, regardez une autre tuile accessible. Elle se referme ensuite et le tour passe.</li>
    <li>Au fond, quatre cavités cachent un œuf à deux étoiles, deux œufs cassés et deux cailloux réunis sur une tuile.</li>
    <li>Réunissez les huit étoiles des fossiles et les deux de l’œuf avant la casse de la dernière pelle. En solo, vous commencez avec huit pelles et deux brouettes.</li>
  </ol>
  <p>D’après Archéo, de Thomas Favrelière et Adrien Pédron, édité par Gigamic. <a target="_blank" rel="noopener" href="https://www.gigamic.com/index.php?controller=attachment&amp;id_attachment=631">Livret officiel</a></p>`;

const archeoColors = ['#89e1db','#ffbd78','#e6a1dc','#c9e692','#afbeff'];
const archeoIcons = {peek:'🔎',repair:'🔨',rock:'🪨',shell:'🥚'};
const archeoCart = '<span class="ar-cart-icon" aria-hidden="true"></span>';
const archeoSpade = '<span class="ar-tool-icon" aria-hidden="true"></span>';
const archeoLabels = {cart:'Une brouette',peek:'Une loupe',repair:'Pelles réparées',rock:'Attention, cailloux !',egg:'L’œuf aux deux étoiles !',shell:'Un œuf cassé'};

function archeoArt(index, extra = '') {
  return `<img class="ar-art ${extra}" src="./covers/archeo-fossil-${index}.webp" alt="" draggable="false">`;
}

function archeoSymbol(tile) {
  if (tile.kind === 'fossil') return archeoArt(tile.fossil);
  if (tile.kind === 'egg') return `<span class="ar-found-egg">${archeoArt(5)}<i aria-hidden="true">★★</i></span>`;
  if (tile.kind === 'cart') return `<span class="ar-symbol">${archeoCart}</span>`;
  return `<span class="ar-symbol" aria-hidden="true">${archeoIcons[tile.kind].repeat(tile.kind === 'rock' || tile.kind === 'repair' ? tile.amount : 1)}${tile.kind === 'shell' ? '<b>╱</b>' : ''}</span>`;
}

function archeoGame() {
  let count = 2, first = 0, game, busy = false, muted = false, audio, ticket = 0;
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  app.innerHTML = `<section class="ar"><div class="ar-bar"><button class="secondary" id="back">← Jeux</button>
    <button class="secondary" data-ar-sound aria-pressed="true">♪ Son</button><button class="secondary" data-ar-rules>? Règles</button></div>
    <div class="ar-stage"></div><dialog class="ar-dialog" aria-label="Règles des Fouilles d’Archéo">${archeoRules}
    <form method="dialog"><button class="ar-primary">Fermer</button></form></dialog></section>`;
  const root = app.querySelector('.ar');
  const stage = root.querySelector('.ar-stage');
  const dialog = root.querySelector('.ar-dialog');
  const focus = selector => stage.querySelector(selector)?.focus({ preventScroll:true });

  function sound(notes) {
    if (muted || !window.AudioContext) return;
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const now = audio.currentTime;
    notes.forEach((frequency,i) => {
      const time = now + i*.085;
      const tone = audio.createOscillator(), gain = audio.createGain();
      tone.type = 'triangle';
      tone.frequency.setValueAtTime(frequency,time);
      gain.gain.setValueAtTime(.001,time);
      gain.gain.exponentialRampToValueAtTime(.085,time+.019);
      gain.gain.exponentialRampToValueAtTime(.001,time+.22);
      tone.connect(gain).connect(audio.destination);
      tone.start(time);
      tone.stop(time+.23);
    });
  }

  function setup() {
    game = null;
    stage.innerHTML = `<div class="ar-intro"><div class="ar-cover"><h1>Les Fouilles d’Archéo</h1></div><div class="ar-setup">
      <fieldset><legend>Paléontologues</legend><div class="ar-choices">${[1,2,3,4,5].map(n => `<button data-ar-count="${n}" aria-pressed="${count === n}">${n}</button>`).join('')}</div></fieldset>
      ${count > 1 ? `<label>Qui a creusé un trou en dernier ? <select data-ar-first>${Array.from({length:count},(_,i) => `<option value="${i}" ${first === i ? 'selected' : ''}>Joueur ${i+1}</option>`).join('')}</select></label>` : ''}
      <button class="ar-primary" data-ar-start>⛏️ Fouiller</button></div></div>`;
  }

  function collection() {
    return `<div class="ar-gallery" aria-label="Collection de fossiles">${archeoFossils.map(({name,groups},i) => {
      const length = groups.flat().length;
      return `<article class="ar-fossil" data-fossil="${i}" data-complete="${game.found[i].size === length}">
        <div class="ar-display">${archeoArt(i,'ar-ghost')}${Array.from(game.found[i], part => `<span class="ar-fragment" data-part="${part}" style="--cut-left:${part*100/length}%;--cut-right:${(length-part-1)*100/length}%">${archeoArt(i)}</span>`).join('')}</div>
        <div class="ar-fossil-label"><b>${name}</b><span aria-label="${game.fossilScore(i)} étoiles sur ${groups.length}">${groups.map(group => `<i class="${group.every(part => game.found[i].has(part)) ? 'earned' : ''}">★</i>`).join('')}</span></div></article>`;
    }).join('')}<article class="ar-fossil ar-egg" data-complete="${game.egg}"><div class="ar-display">${archeoArt(5,game.egg ? '' : 'ar-ghost')}</div><div class="ar-fossil-label"><b>Œuf secret</b><span><i class="${game.egg ? 'earned' : ''}">★★</i></span></div></article></div>`;
  }

  function tileMarkup(tile, accessible) {
    const coords = `style="--x:${tile.x};--y:${tile.y};--level:${tile.level};--variant:${tile.id.split('-')[1]%4}"`;
    const hint = tile.hint ? '<span class="ar-hint" aria-hidden="true">🦴</span>' : '';
    return accessible ? `<button ${coords} class="ar-tile ar-level-${tile.level}" data-ar-dig="${tile.id}" aria-label="${archeoDepth[tile.level]}, case ${tile.id.split('-')[1]*1+1}${tile.hint ? ', indice os' : ''}">${hint}</button>` :
      `<span ${coords} class="ar-tile ar-level-${tile.level} covered" aria-hidden="true">${hint}</span>`;
  }

  function render() {
    const open = new Set(game.accessible());
    const peek = game.phase === 'peek';
    const label = peek ? '🔎 Choisis une tuile à regarder' : 'Touche une tuile dégagée';
    stage.innerHTML = `<div class="ar-board" style="--player:${archeoColors[game.turn]}" data-phase="${game.phase}">
      <div class="ar-hud"><span class="ar-score" aria-label="${game.score} étoiles sur 10">★ ${game.score} / 10</span>
        <div class="ar-tools" aria-label="${game.tools} pelles sur ${game.maxTools}">${Array.from({length:game.maxTools},(_,i) => `<span class="${i >= game.tools ? 'broken' : ''}" aria-hidden="true">${archeoSpade}</span>`).join('')}</div></div>
      <div class="ar-work"><div class="ar-site"><div class="ar-pit" aria-label="Site de fouilles">${game.tiles.filter(t => !t.dug).map(tile => tileMarkup(tile,open.has(tile) && (game.phase === 'dig' || peek))).join('')}</div>
        <div class="ar-turn" role="status"><b>${count === 1 ? 'Solo' : 'Joueur ' + (game.turn+1)}</b><span>${label}</span></div></div>
      <aside class="ar-museum">${collection()}<div class="ar-players" aria-label="Brouettes personnelles">${game.carts.map((cart,i) => `<span class="ar-player" style="--seat:${archeoColors[i]}" data-current="${i === game.turn}" aria-label="Joueur ${i+1}, ${cart} brouettes"><b>${i+1}</b> ${archeoCart} ${cart}</span>`).join('')}</div></aside></div>
    </div>`;
    if (!busy) focus('[data-ar-dig]');
  }

  function outcome(tile, { look = false, risk = false, text = '' } = {}) {
    const label = text || (tile.kind === 'fossil' ? archeoFossils[tile.fossil].name : look && tile.kind === 'repair' ? 'Des marteaux' : archeoLabels[tile.kind]);
    stage.querySelector('.ar-board').insertAdjacentHTML('beforeend', `<div class="ar-overlay" ${risk ? 'data-risk' : ''}><div class="ar-find" data-kind="${tile.kind}" role="${risk ? 'group' : 'status'}" aria-label="${label}">
      ${archeoSymbol(tile)}<strong>${look ? '🔎 ' : ''}${label}</strong>
      ${risk ? `<div class="ar-choices"><button class="ar-primary" data-ar-protect="yes">${archeoCart} Utiliser (${game.carts[game.turn]})</button><button data-ar-protect="no" aria-label="Perdre ${tile.amount} pelle${tile.amount === 1 ? '' : 's'}">${archeoSpade} −${tile.amount}</button></div>` : ''}</div></div>`);
    if (risk) focus('[data-ar-protect]');
  }

  const wait = ms => new Promise(resolve => setTimeout(resolve,motion.matches ? ms : Math.min(ms,180)));

  function finish() {
    const win = game.score === 10;
    const result = game.score >= 7 ? 'Experts en fouilles !' : game.score >= 4 ? 'De vrais paléontologues en herbe !' : 'Sur la piste des fossiles !';
    const confetti = win ? Array.from({length:24},(_,i) => `<i style="--left:${i*100/24}%;--delay:${i%6*75}ms">✦</i>`).join('') : '';
    stage.innerHTML = `<div class="ar-finish" data-win="${win}"><div class="ar-confetti" aria-hidden="true">${confetti}</div>
      <span class="ar-medal" aria-hidden="true">${win ? '🏆' : archeoSpade}</span><h2 tabindex="-1">${win ? 'Super paléontologues !' : 'Toutes les pelles sont cassées'}</h2>
      <span class="ar-score">★ ${game.score} / 10</span>${win ? '' : `<p>${result}</p>`}${collection()}<div class="ar-choices"><button class="ar-primary" data-ar-start>↻ Rejouer</button><button data-ar-setup>Réglages</button></div></div>`;
    sound(win ? [523,659,784,1047] : [466,392,293]);
    focus('.ar-finish h2');
  }

  function next() {
    game.advance();
    busy = false;
    if (game.phase === 'finished') finish();
    else render();
  }

  async function fileFossil(tile) {
    const origin = stage.querySelector('.ar-find .ar-art').getBoundingClientRect();
    const fragment = stage.querySelector(`[data-fossil="${tile.fossil}"] [data-part="${tile.part}"]`);
    const target = fragment.querySelector('img');
    const destination = target.getBoundingClientRect();
    stage.querySelector('.ar-overlay').remove();
    const flight = fragment.animate([
      { translate:`${origin.left-destination.left}px ${origin.top-destination.top}px`, scale:`${origin.width/destination.width}`, opacity:.85 },
      { translate:'0 0', scale:'1', opacity:1 },
    ],{ duration:360, easing:'cubic-bezier(.18,.7,.34,1)' });
    await flight.finished.catch(() => {});
    fragment.closest('.ar-fossil').classList.add('added');
  }

  async function showResult(tile, run, protectedRock = false) {
    render();
    const message = tile.kind === 'rock' ? protectedRock ? 'Brouette utilisée !' : `Pelles abîmées · −${tile.amount}` : '';
    outcome(tile,{text:message});
    if (tile.kind === 'rock' && !protectedRock) stage.querySelector('.ar-tools').classList.add('shaken');
    sound(tile.kind === 'rock' && !protectedRock ? [392,262,196] : [523,659,880]);
    await wait(840);
    if (run !== ticket) return;
    if (motion.matches && tile.kind === 'fossil') {
      await fileFossil(tile);
      await wait(150);
    }
    if (run === ticket) next();
  }

  async function dig(button) {
    const looking = game.phase === 'peek';
    const tile = game.select(button.dataset.arDig);
    if (!tile) return;
    busy = true;
    const run = ticket;
    button.classList.add('lifting');
    if (!looking && motion.matches) {
      button.insertAdjacentHTML('beforeend',`<span class="ar-spade" aria-hidden="true">${archeoSpade}</span><span class="ar-dust" aria-hidden="true"></span>`);
      sound([247,196]);
      await wait(360);
    }
    if (run !== ticket) return;
    if (looking) {
      render();
      outcome(tile,{look:true});
      sound([587,740]);
      await wait(1050);
      if (run === ticket) next();
      return;
    }
    game.resolve();
    if (game.phase === 'risk') {
      render();
      outcome(tile,{risk:true});
      sound([330,247]);
      busy = false;
    } else if (game.phase === 'peek') {
      render();
      outcome(tile,{text:'Regarde sous une autre tuile !'});
      sound([587,740]);
      await wait(720);
      if (run !== ticket) return;
      busy = false;
      render();
    } else await showResult(tile,run);
  }

  root.addEventListener('change', event => {
    if (event.target.matches('[data-ar-first]')) first = Number(event.target.value);
  });
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const data = button.dataset;
    if (button.id === 'back') {
      ticket++;
      audio?.close().catch(() => {});
      home('[data-detail="archeo"]');
    } else if ('arRules' in data) dialog.showModal();
    else if ('arSound' in data) {
      muted = !muted;
      button.textContent = muted ? '🔇 Son' : '♪ Son';
      button.setAttribute('aria-pressed',!muted);
      if (muted) audio?.suspend().catch(() => {});
      else sound([523,784]);
    } else if ('arCount' in data) {
      count = Number(data.arCount);
      first = Math.min(first,count-1);
      setup();
      focus(`[data-ar-count="${count}"]`);
    } else if ('arStart' in data) {
      ticket++;
      busy = false;
      game = new ArcheoGame(count,first);
      sound([392,523,659]);
      render();
    } else if ('arSetup' in data) {
      setup();
      focus('[data-ar-start]');
    } else if (!busy && !dialog.open && game) {
      if ('arDig' in data) dig(button);
      else if ('arProtect' in data && game.phase === 'risk') {
        busy = true;
        const tile = game.pending;
        const protect = data.arProtect === 'yes';
        game.resolve(protect);
        showResult(tile,ticket,protect);
      }
    }
  });
  setup();
}
