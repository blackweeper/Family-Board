const mosaicRules = `
  <h2>Comment jouer ?</h2>
  <ol>
    <li>Le plus jeune commence. Touche une tuile pour prendre toutes celles de la même couleur dans ce bol. Si c’est un petit bol, le reste va dans le grand bol.</li>
    <li>Touche une case éclairée pour poser les tuiles correspondantes. Les tuiles en trop passent à gauche. Celles qui font le tour complet sont mises de côté.</li>
    <li>Quand les six bols sont vides, les petits bols reçoivent chacun jusqu’à cinq nouvelles tuiles du sac.</li>
  </ol>
  <p><strong>Apprenti.</strong> La première mosaïque terminée gagne.</p>
  <p><strong>Maître.</strong> Choisis un seul petit dessin par lot. Chaque dessin terminé rapporte ses étoiles. Il y a autant de remplissages que de joueurs, en comptant le premier. Après le dernier, jouez jusqu’à vider les bols. Le plus d’étoiles gagne, et la victoire peut être partagée.</p>
  <p>Adaptation d’Azul Kids, un jeu de Michael Kiesling publié par Space Cow. <a href="https://www.asmodee.be/product/azul-kids-fr/" target="_blank" rel="noopener">Découvrir le jeu de société</a></p>`;

function mosaicTile(type, extra = '') {
  return `<span class="mos-tile ${extra}" data-piece="${type}" aria-hidden="true"></span>`;
}

function mosaicPreview(id) {
  const { pattern } = mosaicBoards[id];
  return `<span class="mos-mini" style="--cols:${pattern[0].length}" aria-hidden="true">${pattern.join('').split('').map(type => type === '.' ? '<i></i>' : mosaicTile(type)).join('')}</span>`;
}

function mosaicGame() {
  const soundtrack = familyMusic();
  let lineup = [0,1,2,3], count = 2, selected = 0, first = 0, mode = 'apprentice';
  let game, busy = false, generation = 0, muted = false, audio;
  const animate = matchMedia('(prefers-reduced-motion: no-preference)');
  app.innerHTML = `<section class="mos"><div class="mos-bar">
      <button class="secondary" id="back">← Jeux</button><button class="secondary" data-mos-sound aria-pressed="true">♪ Son</button>
      <button class="secondary" data-mos-rules>? Règles</button></div><div class="mos-stage"></div>
      <dialog class="mos-dialog" aria-label="Règles de L’Atelier des mosaïques">${mosaicRules}
      <form method="dialog"><button class="mos-primary">Fermer</button></form></dialog></section>`;
  const root = app.querySelector('.mos');
  const stage = root.querySelector('.mos-stage');
  const dialog = root.querySelector('dialog');
  const focus = selector => stage.querySelector(selector)?.focus({ preventScroll:true });
  const title = seat => mosaicBoards[lineup[seat]].name;

  function sound(notes) {
    if (muted || !window.AudioContext) return;
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const now = audio.currentTime;
    notes.forEach((frequency, index) => {
      const time = now + index * .075;
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.type = 'sine';
      tone.frequency.value = frequency;
      gain.gain.setValueAtTime(.001,time);
      gain.gain.exponentialRampToValueAtTime(.14,time+.013);
      gain.gain.exponentialRampToValueAtTime(.001,time+.25);
      tone.connect(gain).connect(audio.destination);
      tone.start(time);
      tone.stop(time+.26);
    });
  }

  function setup() {
    soundtrack.stop();
    game = null;
    stage.innerHTML = `<div class="mos-intro"><div class="mos-hero"><h1>L’Atelier des mosaïques</h1></div><div class="mos-setup">
      <fieldset><legend>Joueurs</legend><div class="mos-choices">${[2,3,4].map(n => `<button data-mos-count="${n}" aria-pressed="${n === count}">${n}</button>`).join('')}</div></fieldset>
      <fieldset><legend>Mode</legend><div class="mos-choices">${['apprentice','master'].map(id => `<button data-mos-mode="${id}" aria-pressed="${id === mode}">${id === 'apprentice' ? '✦ Apprenti' : '✦✦ Maître'}</button>`).join('')}</div></fieldset>
      <fieldset><legend>Choisissez vos mosaïques</legend><div class="mos-choices">${lineup.slice(0,count).map((id,i) => `<button data-mos-seat="${i}" aria-pressed="${selected === i}" aria-label="Joueur ${i+1}, ${title(i)}">${i+1} ${mosaicBoards[id].icon}</button>`).join('')}</div>
      <div class="mos-patterns">${mosaicBoards.map((board,i) => `<button data-mos-pattern="${i}" aria-label="${board.name}" aria-pressed="${lineup[selected] === i}">${mosaicPreview(i)}</button>`).join('')}</div></fieldset>
      <label class="mos-first">Le plus jeune <select data-mos-first>${lineup.slice(0,count).map((_,i) => `<option value="${i}" ${first === i ? 'selected' : ''}>Joueur ${i+1} · ${title(i)}</option>`).join('')}</select></label>
      <button class="mos-primary" data-mos-start>▶ Jouer</button></div></div>`;
  }

  function drawingMarkup(drawing, index, playable) {
    const complete = drawing.cells.every(cell => cell.filled);
    return `<div class="mos-drawing ${complete ? 'complete' : ''}" data-mos-drawing="${index}" role="group" aria-label="${drawing.name}">
      <div class="mos-grid" style="--cols:${drawing.width};--rows:${drawing.height}">${drawing.cells.map((cell, at) => {
        const tag = playable && cell.type === game.pending.type && !cell.filled && mode !== 'master' ? 'button' : 'span';
        const highlight = playable && cell.type === game.pending.type && !cell.filled ? ' mos-target' : '';
        const action = tag === 'button' ? ` data-mos-place="${index}" data-mos-cell="${at}" aria-label="${mosaicTiles.find(tile => tile.id === cell.type).label} · ${drawing.name}"` : '';
        return `<${tag} class="mos-cell${highlight}" data-cell="${at}" style="--x:${cell.x+1};--y:${cell.y+1}"${action}>${mosaicTile(cell.type,cell.filled ? 'filled' : 'socket')}</${tag}>`;
      }).join('')}</div>${drawing.stars ? `<span class="mos-stars" aria-label="${drawing.stars} étoiles${complete ? ' gagnées' : ''}">${'★'.repeat(drawing.stars)}</span>` : ''}${playable && mode === 'master' ? `<button class="mos-drawing-hit" data-mos-place="${index}" aria-label="Poser sur le dessin ${drawing.name}"></button>` : ''}</div>`;
  }

  function boardMarkup(seat, hero = false) {
    const player = game.players[seat];
    const board = mosaicBoards[player.id];
    const active = !hero && (game.pending?.seat ?? game.turn) === seat;
    const options = active && !busy ? game.options() : [];
    const score = game.score(seat);
    return `<section class="mos-board ${hero ? 'mos-winner' : ''}" data-seat="${seat}" data-active="${active}" style="--ink:${board.color}">
      <header><span class="mos-badge" aria-hidden="true">${board.icon}</span><b>${board.name}</b><span class="mos-score">${mode === 'master' ? '★ ' + score : score + '/' + player.drawings[0].cells.length}</span></header>
      <div class="mos-drawings" data-mode="${mode}">${player.drawings.map((drawing,index) => drawingMarkup(drawing,index,options.includes(index))).join('')}</div></section>`;
  }

  function bowlMarkup(bowl, index) {
    const center = index === -1;
    return `<div class="mos-bowl ${center ? 'mos-center-bowl' : ''}" data-bowl="${index}" role="group" aria-label="${center ? 'Grand bol' : 'Bol ' + (index+1)}">${mosaicTiles.flatMap(({ id, label }) => {
      const copies = bowl.filter(type => type === id).length;
      if (!copies) return [];
      return [`<button data-mos-draft="${index}" data-type="${id}" aria-disabled="${!!game.pending}" aria-label="${copies} · ${label}">${mosaicTile(id)}${copies > 1 ? `<small>×${copies}</small>` : ''}</button>`];
    }).join('')}</div>`;
  }

  function render(refill = false) {
    const { pending, turn } = game;
    const active = pending?.seat ?? turn;
    const passing = pending && pending.seat !== turn;
    const action = mode === 'master' ? 'Choisis un dessin éclairé' : 'Pose sur une forme éclairée';
    const instruction = pending ? (passing ? 'À toi de poser' : action) : 'Choisis une couleur dans un bol';
    const board = mosaicBoards[lineup[active]];
    stage.innerHTML = `<div class="mos-table" data-count="${count}" ${refill ? 'data-refill' : ''}>
      <div class="mos-supply" style="--ink:${board.color}"><div class="mos-turn" role="status"><span class="mos-badge" aria-hidden="true">${board.icon}</span><div><b>Joueur ${active+1} · ${board.name}</b><small>${instruction}</small></div></div>
      <div class="mos-bowls">${game.bowls.map(bowlMarkup).join('')}${bowlMarkup(game.center,-1)}</div>
      <div class="mos-hand" aria-label="${pending?.count ?? 0} tuiles à poser">${pending?.count ? `${mosaicTile(pending.type)}<strong>×${pending.count}</strong>` : `<span aria-label="Sac">▰ ${game.bag.length}</span>${mode === 'master' ? `<span aria-label="Remplissages">${game.fills}/${count}</span>` : ''}`}</div></div>
      ${game.players.map((_,seat) => boardMarkup(seat)).join('')}</div>`;
    if (!busy) {
      const control = stage.querySelector(pending ? '[data-mos-place]' : '[data-mos-draft]');
      control?.focus({ preventScroll:true });
      if (innerWidth <= 720) control?.scrollIntoView({ block:'nearest', inline:'nearest' });
    }
  }

  function fly(type, start, end, delay = 0) {
    if (!animate.matches || !start || !end) return Promise.resolve();
    const holder = document.createElement('div');
    holder.className = 'mos-flight';
    holder.innerHTML = mosaicTile(type);
    holder.style.left = `${start.left+start.width/2}px`;
    holder.style.top = `${start.top+start.height/2}px`;
    root.append(holder);
    const dx = end.left + end.width/2 - start.left - start.width/2;
    const dy = end.top + end.height/2 - start.top - start.height/2;
    const flight = holder.animate([
      { transform:'translate(-50%,-50%) scale(.85)' },
      { transform:`translate(calc(-50% + ${dx*.49}px),calc(-50% + ${dy*.5-28}px)) rotate(-21deg) scale(1.18)` },
      { transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.7)`, opacity:.75 },
    ], { duration:410, delay, fill:'both', easing:'ease-in-out' });
    return flight.finished.catch(() => {}).finally(() => holder.remove());
  }

  const rect = selector => stage.querySelector(selector)?.getBoundingClientRect();
  const wait = ms => animate.matches ? new Promise(resolve => setTimeout(resolve,ms)) : Promise.resolve();

  function finish() {
    soundtrack.stop();
    const { winners } = game;
    const confetti = Array.from({ length:22 }, (_,i) => `<i style="--left:${i*100/22}%;--delay:${i%6*85}ms"></i>`).join('');
    stage.innerHTML = `<div class="mos-finish"><div class="mos-confetti" aria-hidden="true">${confetti}</div>
      <div class="mos-trophy" aria-hidden="true">🏆</div><h2 tabindex="-1">${winners.length === 1 ? title(winners[0])+' gagne !' : 'Victoire partagée !'}</h2>
      <div class="mos-winners">${winners.map(seat => boardMarkup(seat,true)).join('')}</div>
      <div class="mos-choices"><button class="mos-primary" data-mos-start>↻ Rejouer</button><button data-mos-setup>Réglages</button></div></div>`;
    sound([523,659,784,1047,1319]);
    focus('.mos-finish h2');
  }

  async function settle(run) {
    while (run === generation) {
      if (game.winners) { finish(); return; }
      if (game.options().length) {
        busy = false;
        render();
        return;
      }
      const { type, count: extra } = game.pending;
      const from = rect('.mos-hand');
      const next = game.pass();
      if (next === 'finished') { finish(); return; }
      if (next !== 'pass') {
        busy = false;
        if (next === 'refill') sound([440,587,740]);
        render(next === 'refill');
        return;
      }
      render();
      if (extra) {
        sound([587,494]);
        await fly(type,from,rect(`.mos-board[data-seat="${game.pending.seat}"] header`));
      }
    }
  }

  async function draft(button) {
    const index = Number(button.dataset.mosDraft);
    const { type } = button.dataset;
    const from = button.getBoundingClientRect();
    const leftovers = index === -1 ? [] : game.bowls[index].filter(tile => tile !== type);
    if (!game.draft(index,type)) return;
    busy = true;
    const run = generation;
    render();
    sound([440,660]);
    await Promise.all([fly(type,from,rect('.mos-hand')), ...[...new Set(leftovers)].map((tile,i) => fly(tile,from,rect('.mos-center-bowl'),i*45))]);
    if (run === generation) await settle(run);
  }

  async function place(button) {
    const index = Number(button.dataset.mosPlace);
    const { seat, type } = game.pending;
    const drawing = game.players[seat].drawings[index];
    const from = rect('.mos-hand');
    const filled = game.place(index,drawing.cells[Number(button.dataset.mosCell)]);
    if (!filled.length) return;
    busy = true;
    const run = generation;
    render();
    const destinations = filled.map(cell => stage.querySelector(`.mos-board[data-seat="${seat}"] [data-mos-drawing="${index}"] [data-cell="${drawing.cells.indexOf(cell)}"] .mos-tile`));
    if (animate.matches) destinations.forEach(el => el.style.opacity = '0');
    sound(drawing.cells.every(cell => cell.filled) ? [494,659,784,988] : [587,784]);
    await Promise.all(destinations.map((el,i) => fly(type,from,el.getBoundingClientRect(),i*63).then(() => {
      el.style.opacity = '';
      if (animate.matches) el.animate([{ scale:'.65' },{ scale:'1.17' },{ scale:'1' }],{ duration:240 });
    })));
    if (run !== generation) return;
    await wait(160);
    if (run === generation) await settle(run);
  }

  root.addEventListener('change', event => {
    if (event.target.matches('[data-mos-first]')) first = Number(event.target.value);
  });
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const data = button.dataset;
    if (button.id === 'back') {
      generation++;
      soundtrack.close();
      audio?.close().catch(() => {});
      home('[data-detail="mosaic"]');
    } else if ('mosRules' in data) dialog.showModal();
    else if ('mosSound' in data) {
      muted = !muted;
      soundtrack.mute(muted);
      button.textContent = muted ? '🔇 Son' : '♪ Son';
      button.setAttribute('aria-pressed', !muted);
      if (muted) audio?.suspend().catch(() => {});
      else sound([523,784]);
    } else if ('mosStart' in data) {
      generation++;
      busy = false;
      game = new MosaicGame(lineup.slice(0,count),mode,first);
      soundtrack.start('mosaic');
      sound([392,523,659]);
      render(true);
    } else if ('mosSetup' in data) {
      setup();
      focus('[data-mos-start]');
    } else if (!game) {
      if ('mosCount' in data) {
        count = Number(data.mosCount);
        selected = Math.min(selected,count-1);
        first = Math.min(first,count-1);
      } else if ('mosMode' in data) mode = data.mosMode;
      else if ('mosSeat' in data) selected = Number(data.mosSeat);
      else if ('mosPattern' in data) {
        const id = Number(data.mosPattern);
        const other = lineup.indexOf(id);
        if (other >= 0) lineup[other] = lineup[selected];
        lineup[selected] = id;
      } else return;
      const attribute = button.getAttributeNames().find(name => name.startsWith('data-mos-'));
      setup();
      focus(`[${attribute}="${button.getAttribute(attribute)}"]`);
    } else if (!busy && !dialog.open && !game.winners) {
      if ('mosDraft' in data) draft(button);
      else if ('mosPlace' in data && game.pending) place(button);
    }
  });
  setup();
}
