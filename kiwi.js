const kiwiTeams = [
  { name: 'Bleu', color: '#58d8ff', ink: '#174a87', mark: '◆' },
  { name: 'Rose', color: '#ff8ebd', ink: '#8d2851', mark: '♥' },
  { name: 'Jaune', color: '#ffdf70', ink: '#765013', mark: '☀' },
  { name: 'Vert', color: '#bcf57e', ink: '#315f28', mark: '✿' },
];

const kiwiRules = '<div class="kiwi-rules-copy"><h3>La course à l’embarquement</h3><ol>' +
  '<li>Choisissez une couleur. Chacun a dix kiwis et une rampe. Au signal, tout le monde joue en même temps.</li>' +
  '<li>Pose un doigt sur ton kiwi, tire l’élastique vers toi et relâche. Tire plus loin pour lancer plus fort. Décale le doigt sur le côté pour viser dans la direction opposée. Les boutons − et + règlent la distance de ta rampe.</li>' +
  '<li>Un kiwi qui tombe à côté revient dans ta réserve. Un kiwi posé sur la grille reste sur place et sera écarté du décompte. Dans un compartiment, chaque kiwi couvre le précédent.</li>' +
  '<li>Quatre kiwis visibles de ta couleur en carré de deux cases sur deux ? Ki-win ! La partie s’arrête aussitôt.</li>' +
  '<li>Si personne n’a de carré quand tous les kiwis sont arrivés, chaque joueur compte toutes les pièces des piles coiffées par sa couleur, même celles des adversaires. Le plus grand total gagne.</li>' +
  '</ol><p>Au clavier, sélectionne une rampe, règle le tir avec les flèches et lance avec Entrée ou Espace. Essaie le mode Entraînement pour prendre le geste en main.</p>' +
  '<p>Jeu de Marco Teubner et Frank Bebenroth, édité par HUCH! Adaptation numérique illustrée pour Family Board.</p>' +
  '<a href="https://luape.ludos.brussels/doc_num.php?explnum_id=949" target="_blank" rel="noopener">Lire le livret de cette édition</a></div>';

const kiwiImg = (name, className = '') =>
  '<img src="./covers/kiwi-' + name + '.webp" alt="" draggable="false" class="' + className + '">';

function kiwiGame() {
  const session = new AbortController();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let count = 2;
  let colors = [0, 1, 2, 3];
  let muted = false;
  let audio;
  let theme;
  let round;
  let board;
  let table;
  let layer;
  let live;
  let enabled;
  let aim;
  let ramps = [];
  let cells = [];
  const drag = new Map();
  const flights = new Set();
  const timings = new Set();

  app.innerHTML = '<section class="kiwi-game"><div class="kiwi-bar">' +
    '<button class="secondary" id="back">← Jeux</button>' +
    '<button class="secondary" data-kiwi-sound aria-pressed="true">♪ Son</button>' +
    '<button class="secondary" data-kiwi-rules>? Règles</button></div>' +
    '<div class="kiwi-stage"></div><dialog class="kiwi-dialog" aria-label="Règles de Flying Kiwis">' +
    kiwiRules + '<form method="dialog"><button class="kiwi-main">Fermer</button></form></dialog></section>';
  const root = app.querySelector('.kiwi-game');
  const stage = root.querySelector('.kiwi-stage');
  const dialog = root.querySelector('.kiwi-dialog');

  const team = seat => kiwiTeams[colors[seat]];
  const teamStyle = seat => '--team:' + team(seat).color + ';--ink:' + team(seat).ink;
  const art = (seat, cls) => kiwiImg('bird-' + colors[seat], cls);
  const playerName = seat => 'Joueur ' + (seat + 1) + ' · ' + team(seat).name;

  function sound(notes, { step = .09, level = .09, duration = .22, type = 'sine' } = {}) {
    if (muted || session.signal.aborted || !window.AudioContext) return;
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    notes.forEach((note, i) => {
      const start = audio.currentTime + i * step;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(note, start);
      gain.gain.setValueAtTime(.001, start);
      gain.gain.exponentialRampToValueAtTime(level, start + .025);
      gain.gain.exponentialRampToValueAtTime(.001, start + duration);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + duration);
    });
  }

  function music() {
    if (theme !== undefined) return;
    let bar = 0;
    const bars = [[392, 523, 659, 587], [349, 440, 523, 659], [330, 392, 587, 523], [349, 440, 587, 698]];
    theme = setInterval(() => {
      if (round && !round.result && audio?.state === 'running' && !document.hidden) {
        sound(bars[bar++ % bars.length], { step: .34, duration: .58, level: .018, type: 'triangle' });
      }
    }, 2900);
  }

  function after(fn, delay) {
    const timer = setTimeout(() => {
      timings.delete(timer);
      if (!session.signal.aborted) fn();
    }, delay);
    timings.add(timer);
  }

  function stopRound() {
    for (const timer of timings) clearTimeout(timer);
    for (const animation of flights) animation.cancel();
    timings.clear();
    flights.clear();
    drag.clear();
    enabled = false;
  }

  function animate(node, keyframes, duration, options = {}) {
    if (motion.matches || !node?.animate) return;
    const animation = node.animate(keyframes, { duration, ...options });
    flights.add(animation);
    animation.finished.then(() => flights.delete(animation), () => flights.delete(animation));
    return animation;
  }

  function setup() {
    stopRound();
    round = null;
    stage.innerHTML = '<div class="kiwi-intro"><div class="kiwi-intro-copy">' +
      '<h1>Flying<br><em>Kiwis</em></h1><p class="kiwi-meta">2 à 4 joueurs · Dès 5 ans</p>' +
      '<fieldset><legend>Nombre de joueurs</legend><div class="kiwi-options">' +
        [2, 3, 4].map(n => '<button data-count="' + n + '" aria-pressed="' + (count === n) + '">' + n + '</button>').join('') +
      '</div></fieldset><fieldset><legend>Couleur de chaque joueur</legend><div class="kiwi-options">' +
        colors.slice(0, count).map((_, seat) => '<button class="kiwi-select" data-color="' + seat + '" style="' + teamStyle(seat) +
          '" aria-label="Changer la couleur · ' + playerName(seat) + '">' + art(seat) +
          '<b>' + team(seat).mark + ' ' + (seat + 1) + '</b></button>').join('') +
      '</div></fieldset><div class="kiwi-options"><button class="kiwi-main" data-start>▶ Jouer</button>' +
      '<button class="secondary" data-practice>Entraînement</button></div></div></div>';
  }

  function ramp(seat) {
    return '<section class="kiwi-ramp" data-seat="' + seat + '" style="' + teamStyle(seat) +
      ';--angle:' + kiwiSeats[seat].angle + 'deg" aria-label="' + playerName(seat) + '">' +
      '<div class="kiwi-ramp-inner"><div class="kiwi-ramp-count">' +
      '<b aria-hidden="true">' + team(seat).mark + '</b><span class="kiwi-stock">10</span>' +
      '<div class="kiwi-pips" aria-hidden="true">' + '<i></i>'.repeat(10) + '</div></div>' +
      '<div class="kiwi-catapult">' + kiwiImg('ramp', 'kiwi-ramp-art') +
      '<span class="kiwi-rubber left"></span><span class="kiwi-rubber right"></span>' +
      '<button data-launch="' + seat + '" aria-label="' + playerName(seat) + ' · tirer puis relâcher la catapulte">' +
      art(seat) + '<span aria-hidden="true">↡</span></button></div>' +
      '<div class="kiwi-range"><button data-range="-1" aria-label="' + playerName(seat) + ' · rapprocher la rampe">−</button>' +
      '<span class="kiwi-range-value" aria-hidden="true">●</span>' +
      '<button data-range="1" aria-label="' + playerName(seat) + ' · éloigner la rampe">+</button></div></div></section>';
  }

  function prepare(practice = false) {
    stopRound();
    round = new KiwiRace(colors.slice(0, count), practice);
    aim = round.teams.map(() => ({ pull: .56, side: -.17, distance: 0 }));
    stage.innerHTML = '<div class="kiwi-arena"><div class="kiwi-arena-bar">' +
      (practice ? '<strong>Entraînement</strong><button class="secondary" data-start>Jouer</button>' :
        '<button class="secondary" data-setup>Nouvelle partie</button>') + '</div>' +
      '<div class="kiwi-table" data-player-count="' + count + '"><div class="kiwi-crate" aria-label="Caisse de 16 compartiments">' +
      Array.from({ length: 16 }, (_, i) => '<div class="kiwi-cell" role="img" data-cell="' + i +
        '" aria-label="Compartiment ' + (i + 1) + ', vide"></div>').join('') +
      '</div>' + round.teams.map((_, seat) => ramp(seat)).join('') +
      '<div class="kiwi-air" aria-hidden="true"></div><div class="kiwi-countdown" aria-hidden="true"></div>' +
      '<p class="kiwi-live" role="status" aria-live="polite"></p></div></div>';
    table = stage.querySelector('.kiwi-table');
    board = table.querySelector('.kiwi-crate');
    layer = table.querySelector('.kiwi-air');
    live = table.querySelector('.kiwi-live');
    cells = [...board.children];
    ramps = [...table.querySelectorAll('.kiwi-ramp')];
    ramps.forEach((rampNode, seat) => {
      updateRamp(seat);
      const trigger = rampNode.querySelector('[data-launch]');
      trigger.onpointerdown = beginPull;
      trigger.onpointermove = pull;
      trigger.onpointerup = release;
      trigger.onpointercancel = cancelPull;
      trigger.onlostpointercapture = cancelPull;
      trigger.onkeydown = onAimKey;
    });
    music();
    if (practice) {
      enable();
      live.textContent = 'Tire le kiwi vers toi, puis relâche.';
    } else countdown();
  }

  function enable() {
    enabled = true;
    ramps.forEach((_, seat) => updateRamp(seat));
  }

  function countdown() {
    const node = table.querySelector('.kiwi-countdown');
    let step = 3;
    function tick() {
      node.textContent = step > 0 ? String(step) : 'Partez !';
      sound(step ? [444] : [523, 784, 1047], { step: .06, level: .075 });
      animate(node, [{ scale: '.74', opacity: 0 }, { scale: '1.15', opacity: 1, offset: .2 }, { scale: '1', opacity: 0 }], 680);
      if (step-- > 0) after(tick, 690);
      else {
        enable();
        live.textContent = 'Tirez les élastiques et relâchez !';
        after(() => node.remove(), 650);
      }
    }
    tick();
  }

  function updateRamp(seat) {
    const rampNode = ramps[seat];
    const waiting = round.pending.has(seat);
    const empty = !round.practice && round.reserve[seat] === 0;
    const trigger = rampNode.querySelector('[data-launch]');
    trigger.disabled = !enabled || waiting || empty || !!round.result;
    rampNode.classList.toggle('waiting', waiting);
    rampNode.classList.toggle('empty', empty && !waiting);
    rampNode.querySelector('.kiwi-stock').textContent = round.practice ? '∞' : round.reserve[seat];
    [...rampNode.querySelectorAll('.kiwi-pips i')].forEach((dot, i) => dot.classList.toggle('used', i >= round.reserve[seat]));
    rampNode.querySelector('.kiwi-range-value').textContent = ['▏', '●', '▰', '▰▰'][aim[seat].distance + 1];
    rampNode.querySelector('[data-range="-1"]').disabled = aim[seat].distance === -1 || !!round.result;
    rampNode.querySelector('[data-range="1"]').disabled = aim[seat].distance === 2 || !!round.result;
  }

  function boardPoint(point) {
    const tableRect = table.getBoundingClientRect();
    const top = cells[0].getBoundingClientRect();
    const bottom = cells.at(-1).getBoundingClientRect();
    const x = top.left - tableRect.left + top.width / 2 + (point.x - .5) * (bottom.left - top.left) / 3;
    const y = top.top - tableRect.top + top.height / 2 + (point.y - .5) * (bottom.top - top.top) / 3;
    return { x: x / tableRect.width * 100, y: y / tableRect.height * 100 };
  }

  function anchor(seat) {
    const area = table.getBoundingClientRect();
    const origin = ramps[seat].querySelector('[data-launch]').getBoundingClientRect();
    return { x: (origin.left + origin.width / 2 - area.left) / area.width * 100,
      y: (origin.top + origin.height / 2 - area.top) / area.height * 100 };
  }

  function showAim(state) {
    const { seat, power, side } = state;
    const target = kiwiAim(seat, power, side, aim[seat].distance);
    const container = table.getBoundingClientRect();
    const rampNode = ramps[seat];
    if (state.dots.length) {
      rampNode.style.setProperty('--pull', power);
      rampNode.style.setProperty('--side', side);
    }
    const from = anchor(seat);
    const to = boardPoint(target);
    state.dots.forEach((dot, i) => {
      const progress = (i + 1) / 6;
      dot.style.left = from.x + (to.x - from.x) * progress + '%';
      dot.style.top = from.y + (to.y - from.y) * progress - Math.sin(progress * Math.PI) * 46 / container.height * 100 + '%';
      dot.style.opacity = String(1 - i * .13);
    });
    if (state.preview) {
      state.preview.style.left = to.x + '%';
      state.preview.style.top = to.y + '%';
      state.preview.classList.toggle('outside', kiwiLanding(target).kind === 'miss');
    }
  }

  function beginPull(event) {
    if (!enabled || event.button !== 0 || event.currentTarget.disabled) return;
    const node = event.currentTarget;
    const seat = Number(node.dataset.launch);
    if ([...drag.values()].some(state => state.seat === seat)) return;
    node.setPointerCapture(event.pointerId);
    const dots = Array.from({ length: 4 }, () => effectNode('kiwi-dot', seat));
    const preview = round.practice ? effectNode('kiwi-preview', seat) : null;
    const state = { seat, x: event.clientX, y: event.clientY, power: 0, side: 0, dots, preview };
    drag.set(event.pointerId, state);
    ramps[seat].classList.add('drawing');
    showAim(state);
    sound([252], { level: .045, duration: .12 });
  }

  function pull(event) {
    const state = drag.get(event.pointerId);
    if (!state) return;
    const seat = kiwiSeats[state.seat];
    const x = event.clientX - state.x;
    const y = event.clientY - state.y;
    const max = Math.max(41, ramps[state.seat].querySelector('.kiwi-catapult').offsetWidth * .58);
    state.power = Math.max(0, Math.min(1, (x * seat.x + y * seat.y) / max));
    state.side = Math.max(-1, Math.min(1, (x * seat.y - y * seat.x) / max));
    showAim(state);
  }

  function clearPull(event) {
    const state = drag.get(event.pointerId);
    if (!state) return null;
    drag.delete(event.pointerId);
    state.dots.forEach(dot => dot.remove());
    state.preview?.remove();
    ramps[state.seat].classList.remove('drawing');
    ramps[state.seat].style.setProperty('--pull', 0);
    ramps[state.seat].style.setProperty('--side', 0);
    return state;
  }

  function release(event) {
    pull(event);
    const state = clearPull(event);
    if (!state || state.power < .055) return;
    shoot(state.seat, state.power, state.side);
  }

  function cancelPull(event) {
    clearPull(event);
  }

  function onAimKey(event) {
    if (event.repeat && (event.key === ' ' || event.key === 'Enter')) return;
    const seat = Number(event.currentTarget.dataset.launch);
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      shoot(seat, aim[seat].pull, aim[seat].side);
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const state = aim[seat];
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        state.pull = Math.max(.07, Math.min(.99, state.pull + (event.key === 'ArrowUp' ? .075 : -.075)));
      } else state.side = Math.max(-.9, Math.min(.9, state.side + (event.key === 'ArrowLeft' ? .13 : -.13)));
      const temporary = { seat, power: state.pull, side: state.side, dots: [], preview: effectNode('kiwi-preview', seat) };
      showAim(temporary);
      after(() => temporary.preview.remove(), 440);
      live.textContent = 'Puissance ' + Math.round(state.pull * 100) + ' %';
    }
  }

  function effectNode(className, seat, parent = layer) {
    const node = document.createElement('span');
    node.className = className;
    node.style.cssText = teamStyle(seat);
    parent.append(node);
    return node;
  }

  function place(node, { x, y }) {
    node.style.left = x + '%';
    node.style.top = y + '%';
  }

  function flightPath(from, to, seat, scale = 1) {
    const arc = 12 + Math.hypot(to.x - from.x, to.y - from.y) * .13;
    return Array.from({ length: 13 }, (_, i) => {
      const t = i / 12;
      const rise = Math.sin(t * Math.PI);
      return {
        left: from.x + (to.x - from.x) * t + '%',
        top: from.y + (to.y - from.y) * t - rise * arc + '%',
        transform: 'translate(-50%,-50%) rotate(' + (kiwiSeats[seat].angle + t * 350) + 'deg) scale(' +
          (scale * (1 + rise * .5 - t * .18)) + ')',
      };
    });
  }

  function shoot(seat, power, side) {
    if (!enabled || dialog.open) return;
    const bird = round.launch(seat, kiwiAim(seat, power, side, aim[seat].distance));
    if (!bird) return;
    const from = anchor(seat);
    const target = boardPoint(bird.target);
    const to = { x: Math.max(2, Math.min(98, target.x)), y: Math.max(2, Math.min(98, target.y)) };
    const flyer = effectNode('kiwi-flyer', seat);
    flyer.innerHTML = art(seat) + '<i></i>';
    place(flyer, to);
    updateRamp(seat);
    const elastic = ramps[seat].querySelector('.kiwi-catapult');
    animate(elastic, [
      { transform: 'scaleY(.88)' }, { transform: 'scaleY(1.13)', offset: .3 },
      { transform: 'scaleY(.96)', offset: .58 }, { transform: 'none' },
    ], 235, { easing: 'ease-out' });
    sound([254, 433, 674], { step: .045, level: .075, type: 'triangle', duration: .16 });
    const time = motion.matches ? 0 : 455 + power * 180;
    animate(flyer, flightPath(from, to, seat), time, { easing: 'linear' });
    after(() => arrive(bird, flyer, to, from), time);
  }

  function burst(point, seat, quantity = 7) {
    if (motion.matches) return;
    for (let i = 0; i < quantity; i++) {
      const node = effectNode('kiwi-spark', seat);
      place(node, point);
      const angle = i / quantity * Math.PI * 2;
      const reach = 22 + (i % 3) * 12;
      animate(node, [
        { transform: 'translate(-50%, -50%) scale(.8)', opacity: 1 },
        { transform: 'translate(' + Math.cos(angle) * reach + 'px, ' + Math.sin(angle) * reach + 'px) rotate(170deg) scale(.1)', opacity: 0 },
      ], 520, { easing: 'ease-out' });
      after(() => node.remove(), 521);
    }
  }

  function landingPulse(point, seat) {
    if (motion.matches) return;
    const ring = effectNode('kiwi-impact', seat);
    place(ring, point);
    animate(ring, [
      { transform: 'translate(-50%, -50%) scale(.64)', opacity: 1 },
      { transform: 'translate(-50%, -50%) scale(1.7)', opacity: 0 },
    ], 390, { easing: 'ease-out' });
    after(() => ring.remove(), 395);
  }

  function drawCell(index) {
    const pile = round.cells[index];
    const owner = pile.at(-1);
    const cell = cells[index];
    const under = pile.slice(-5, -1).map((bird, i) =>
      '<span class="kiwi-layer" style="' + teamStyle(bird.seat) + ';--layer:' + i + '"></span>').join('');
    cell.innerHTML = '<div class="kiwi-token" style="' + teamStyle(owner.seat) + '">' + under +
      '<span class="kiwi-token-top">' + art(owner.seat) + '<b>' + team(owner.seat).mark + '</b></span>' +
      (pile.length > 1 ? '<strong class="kiwi-pile-number">' + pile.length + '</strong>' : '') + '</div>';
    cell.setAttribute('aria-label', 'Compartiment ' + (index + 1) + ' · ' + pile.length +
      (pile.length === 1 ? ' kiwi' : ' kiwis') + ' · ' + team(owner.seat).name + ' au-dessus');
    animate(cell.querySelector('.kiwi-token'), [
      { transform: 'translateY(-36%) scale(.75)' }, { transform: 'translateY(8%) scale(1.07)', offset: .52 }, { transform: 'none' },
    ], 330, { easing: 'ease-out' });
  }

  function arrive(bird, flyer, to, from) {
    if (!round.land(bird)) {
      flyer.remove();
      return;
    }
    if (bird.kind === 'miss') {
      sound([267, 192], { step: .085, duration: .2 });
      burst(to, bird.seat, 4);
      const time = motion.matches ? 0 : 350;
      place(flyer, from);
      animate(flyer, flightPath(to, from, bird.seat, .72), time);
      live.textContent = playerName(bird.seat) + ' · Hors de la caisse, tu peux relancer.';
      after(() => {
        flyer.remove();
        round.retry(bird);
        updateRamp(bird.seat);
        if (!round.result) focusRamp(bird.seat);
      }, time);
      return;
    }
    flyer.remove();
    if (bird.kind === 'cell') {
      drawCell(bird.index);
      landingPulse(to, bird.seat);
      burst(to, bird.seat);
      sound([510, 790], { step: .046, type: 'triangle', duration: .2 });
    } else {
      const perch = effectNode('kiwi-perch', bird.seat);
      perch.innerHTML = art(bird.seat);
      place(perch, to);
      perch.style.rotate = kiwiSeats[bird.seat].angle + 25 + 'deg';
      sound([408, 606, 495], { step: .055, duration: .13 });
      live.textContent = playerName(bird.seat) + ' · Un kiwi reste sur la grille.';
    }
    updateRamp(bird.seat);
    if (round.result) finish(round.result);
    else {
      if (!round.practice && round.reserve[bird.seat] === 0)
        live.textContent = playerName(bird.seat) + ' · Tous tes kiwis sont partis !';
      focusRamp(bird.seat);
    }
  }

  function focusRamp(seat) {
    if (document.activeElement === document.body && root.dataset.keyboard === 'true') {
      ramps[seat].querySelector('[data-launch]').focus({ preventScroll: true });
    }
  }

  function finish(result) {
    enabled = false;
    drag.clear();
    layer.querySelectorAll('.kiwi-dot, .kiwi-preview, .kiwi-flyer').forEach(node => node.remove());
    ramps.forEach((rampNode, seat) => {
      rampNode.classList.remove('drawing');
      updateRamp(seat);
    });
    if (result.kind === 'square') {
      const flash = effectNode('kiwi-win-outline', result.winners[0]);
      const first = cells[result.square[0]].getBoundingClientRect();
      const last = cells[result.square.at(-1)].getBoundingClientRect();
      const parent = table.getBoundingClientRect();
      flash.style.cssText += ';left:' + (first.left - parent.left) / parent.width * 100 +
        '%;top:' + (first.top - parent.top) / parent.height * 100 + '%;width:' +
        (last.right - first.left) / parent.width * 100 + '%;height:' + (last.bottom - first.top) / parent.height * 100 + '%';
      for (const index of result.square) {
        cells[index].classList.add('winner');
        burst(boardPoint({ x: index % 4 + .5, y: Math.floor(index / 4) + .5 }), result.winners[0], 10);
      }
      live.textContent = 'Ki-win ! ' + playerName(result.winners[0]) + ' forme un carré.';
    } else {
      layer.querySelectorAll('.kiwi-perch').forEach(node => node.remove());
      cells.forEach((cell, index) => {
        const stack = round.cells[index];
        if (!stack.length) return;
        const point = boardPoint({ x: index % 4 + .5, y: Math.floor(index / 4) + .5 });
        const seat = stack.at(-1).seat;
        const parcel = effectNode('kiwi-parcel', seat);
        place(parcel, anchor(seat));
        parcel.textContent = '+' + stack.length;
        cell.classList.add('collected');
        animate(parcel, flightPath(point, anchor(seat), seat, .7), 500, { delay: index * 29, fill: 'backwards' });
      });
      live.textContent = 'Toutes les piles retournent à leur propriétaire.';
    }
    sound([523, 659, 784, 1047, 1319], { step: .13, duration: .42, type: 'triangle' });
    after(() => results(result), motion.matches ? 12 : 1550);
  }

  function results(result) {
    const champions = result.winners;
    const title = champions.length > 1 ? 'Victoire partagée !' :
      result.kind === 'square' ? 'Ki-win !' : 'Les kiwis ' + team(champions[0]).name.toLowerCase() + ' gagnent !';
    stage.innerHTML = '<div class="kiwi-results"><div class="kiwi-results-card">' +
      kiwiImg('plane', 'kiwi-plane') + '<div class="kiwi-champions">' +
      champions.map(seat => '<span class="kiwi-champion" style="' + teamStyle(seat) + '">' + art(seat) + '<b>' + team(seat).mark + '</b></span>').join('') +
      '</div><h2>' + title + '</h2><p>' + (champions.length === 1 ? playerName(champions[0]) : champions.map(playerName).join(' / ')) + '</p>' +
      (result.scores ? '<div class="kiwi-results-scores">' + result.scores.map((score, seat) =>
        '<div style="' + teamStyle(seat) + '" aria-label="' + playerName(seat) + '">' + art(seat) + '<b>' + score + '</b></div>').join('') + '</div>' : '') +
      '<div class="kiwi-options"><button class="kiwi-main" data-start>↻ Rejouer</button>' +
      '<button class="secondary" data-setup>Changer les joueurs</button></div></div></div>';
    stage.querySelector('[data-start]').focus({ preventScroll: true });
  }

  root.addEventListener('pointerdown', () => { root.dataset.keyboard = 'false'; });
  root.addEventListener('keydown', () => { root.dataset.keyboard = 'true'; });
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const { dataset } = button;
    if (button.id === 'back') {
      stopRound();
      session.abort();
      clearInterval(theme);
      audio?.close().catch(() => {});
      home('[data-detail="kiwi"]');
    } else if ('kiwiSound' in dataset) {
      muted = !muted;
      button.setAttribute('aria-pressed', String(!muted));
      button.textContent = muted ? '🔇 Son' : '♪ Son';
      if (muted) audio?.suspend().catch(() => {});
      else sound([523, 784]);
    } else if ('kiwiRules' in dataset) dialog.showModal();
    else if ('start' in dataset) prepare();
    else if ('practice' in dataset) prepare(true);
    else if ('setup' in dataset) setup();
    else if ('count' in dataset || 'color' in dataset) {
      const key = 'count' in dataset ? 'count' : 'color';
      const value = Number(dataset[key]);
      if (key === 'count') count = value;
      else {
        const next = (colors[value] + 1) % kiwiTeams.length;
        const other = colors.indexOf(next);
        [colors[value], colors[other]] = [colors[other], colors[value]];
      }
      setup();
      stage.querySelector('[data-' + key + '="' + value + '"]').focus({ preventScroll: true });
    } else if ('range' in dataset) {
      const seat = Number(button.closest('[data-seat]').dataset.seat);
      aim[seat].distance += Number(dataset.range);
      updateRamp(seat);
    }
  });

  setup();
}
