const carrotTeams = [
  { name: 'Bleu', color: '#66cbff', dark: '#286995', symbol: '◆' },
  { name: 'Rose', color: '#ff9dc5', dark: '#9a3363', symbol: '♥' },
  { name: 'Jaune', color: '#ffe178', dark: '#916016', symbol: '☀' },
  { name: 'Violet', color: '#d3b5ff', dark: '#653f94', symbol: '✦' },
];

// Case 0 is the staircase. The two ends of the drawbridge are 13 and 14.
const carrotPoints = [
  [14, 87], [15, 75], [17, 62], [21, 48], [30, 44], [37, 33],
  [45, 23], [55, 24], [65, 27], [78, 34], [85, 44], [86, 58],
  [81, 70], [73, 82], [52, 87], [42, 82], [33, 76], [35, 63],
  [43, 70], [51, 73], [61, 70], [69, 63], [69, 50], [63, 42],
  [54, 39], [45, 40], [50, 54],
];

const carrotArt = (asset, options = '') =>
  '<img src="./covers/carrot-' + asset + '.webp" draggable="false" alt="" ' + options + '>';

const carrotRules = '<div class="carrot-rules-copy"><h3>La course à la carotte</h3><ol>' +
  '<li>Choisis une couleur et place tes quatre lapins au départ. Le plus jeune pioche en premier. Jouez ensuite dans le sens des aiguilles d’une montre.</li>' +
  '<li>Une carte lapin fait avancer un de tes lapins de 1, 2 ou 3 cases. Tu peux aussi en faire entrer un nouveau. Saute les cases occupées. Un trou compte comme une case, et ton lapin est éliminé s’il finit dessus.</li>' +
  '<li>Une carte carotte te fait tourner la carotte dans le sens des aiguilles d’une montre. Si le sol s’ouvre sous un lapin, il est éliminé.</li>' +
  '<li>La taupe renvoie au pied de l’escalier le lapin qui se trouve devant elle. Le pont-levis monte ou descend à chaque clic. S’il est levé, arrête-toi devant ou joue un autre lapin. Le pont lui-même ne compte pas dans le déplacement.</li>' +
  '<li>Quand le tourniquet s’ouvre, le lapin qui s’y trouve glisse au niveau inférieur. Si sa case d’arrivée est occupée ou ouverte, pose-le sur la suivante qui est libre et fermée.</li>' +
  '<li>Quand la pioche est vide, les cartes jouées sont remélangées. Le premier lapin qui atteint la carotte gagne. Les pas en trop sont ignorés.</li>' +
  '</ol><p>D’après le jeu de Ravensburger sous licence Seven Towns. Illustrations créées pour Family Board.</p>' +
  '<p><a href="https://www.papj.fr/contentpapj/uploads/2021/05/Regle-du-jeu-Croque-Carotte.pdf" target="_blank" rel="noopener">Voir le livret de cette édition</a></p></div>';

function carrotGame() {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let count = 2;
  let colors = [0, 1, 2, 3];
  let first = 0;
  let race;
  let muted = false;
  let audio;
  let ambient;
  let busy = false;
  let presented = null;
  let stageNotice = '';
  const session = new AbortController();

  app.innerHTML = '<section class="carrot-game">' +
    '<div class="carrot-bar"><button class="secondary" id="back">← Jeux</button>' +
    '<button class="secondary" data-carrot-sound aria-pressed="true">♪ Son</button>' +
    '<button class="secondary" data-carrot-rules>? Règles</button></div>' +
    '<div class="carrot-stage"></div><dialog class="carrot-modal" aria-label="Règles du jeu">' +
    carrotRules + '<form method="dialog"><button class="carrot-main">Fermer</button></form></dialog></section>';
  const root = app.querySelector('.carrot-game');
  const stage = root.querySelector('.carrot-stage');
  const modal = root.querySelector('.carrot-modal');

  const teamAt = seat => carrotTeams[colors[seat]];
  const teamStyle = seat => '--team:' + teamAt(seat).color + ';--team-dark:' + teamAt(seat).dark;
  const rabbitArt = rabbit => carrotArt('rabbit-' + colors[rabbit.seat]);
  const playerLabel = seat => 'Joueur ' + (seat + 1) + ' · ' + teamAt(seat).name;
  const pointStyle = ([x, y]) => '--x:' + x + '%;--y:' + y + '%';

  function tone(notes, { spacing = .1, duration = .23, volume = .11, wave = 'sine' } = {}) {
    if (muted || session.signal.aborted || !window.AudioContext) return;
    audio ??= new AudioContext();
    audio.resume().catch(() => {});
    notes.forEach((pitch, i) => {
      const start = audio.currentTime + i * spacing;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(pitch, start);
      gain.gain.setValueAtTime(.001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + .035);
      gain.gain.exponentialRampToValueAtTime(.001, start + duration);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + duration);
    });
  }

  function ambience() {
    if (ambient !== undefined) return;
    const phrases = [[784, 988, 1175, 988], [880, 1047, 1319, 1047], [698, 880, 1047, 880], [784, 988, 1175, 1568]];
    let phrase = 0;
    ambient = setInterval(() => {
      if (audio?.state === 'running' && !document.hidden) {
        tone(phrases[phrase++ % phrases.length], { spacing: .34, duration: .75, volume: .018 });
      }
    }, 2600);
  }

  function buttonFocus(selector) {
    const focus = root.querySelector(selector);
    if (focus && document.activeElement !== focus) focus.focus({ preventScroll: true });
  }

  function setup() {
    race = undefined;
    stage.innerHTML = '<div class="carrot-intro"><div class="carrot-intro-card">' +
      '<p class="carrot-intro-meta">2 à 4 joueurs · Dès 4 ans</p><h1>Croque-<br><em>Carotte</em></h1>' +
      '<fieldset><legend>Combien de joueurs ?</legend><div class="carrot-options">' +
      [2, 3, 4].map(n => '<button data-count="' + n + '" aria-pressed="' + (count === n) + '">' + n + '</button>').join('') +
      '</div></fieldset><fieldset><legend>Choisissez vos couleurs</legend><div class="carrot-options">' +
      colors.slice(0, count).map((color, seat) => '<button class="carrot-color" data-color="' + seat +
        '" style="' + teamStyle(seat) + '" aria-label="' + playerLabel(seat) + ' · changer de couleur">' +
        carrotArt('rabbit-' + color) + '<span>' + (seat + 1) + ' ' + teamAt(seat).symbol + '</span></button>').join('') +
      '</div></fieldset><fieldset><legend>Qui est le plus jeune ?</legend><div class="carrot-options">' +
      colors.slice(0, count).map((_, seat) => '<button data-first="' + seat + '" aria-pressed="' + (first === seat) +
        '" style="' + teamStyle(seat) + '" aria-label="' + playerLabel(seat) + ' commence">' + teamAt(seat).symbol + ' ' + (seat + 1) + '</button>').join('') +
      '</div></fieldset><button class="carrot-main" data-start>▶ Jouer</button></div></div>';
  }

  function start() {
    race = new CarrotRace(colors.slice(0, count), first);
    presented = null;
    stageNotice = 'Pioche une carte';
    busy = false;
    tone([523, 659, 784]);
    ambience();
    render();
    buttonFocus('[data-draw]');
  }

  function path() {
    return carrotPoints.slice(0, -1).map(([x, y], index) => {
      const [nextX, nextY] = carrotPoints[index + 1];
      const dx = nextX - x;
      const dy = (nextY - y) / 1.5;
      const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      return '<div class="carrot-path" style="' + pointStyle([x, y]) +
        ';--length:' + length + '%;--angle:' + angle + 'deg"></div>';
    }).join('');
  }

  function piece(rabbit, extra = '', inReserve = false) {
    const plan = race.plan(rabbit);
    const canMove = !busy && !!plan?.steps.length;
    const location = rabbit.lost ? 'éliminé' : rabbit.pos === 0 ? 'au départ' : 'case ' + rabbit.pos;
    const stamp = '<b aria-hidden="true">' + teamAt(rabbit.seat).symbol + '</b>';
    const label = 'Lapin ' + (rabbit.number + 1) + ' · ' + playerLabel(rabbit.seat) + ' · ' + location;
    const attributes = ' data-piece="' + rabbit.id + '" class="carrot-rabbit ' + extra + (rabbit.lost ? ' lost' : '') +
      '" style="' + teamStyle(rabbit.seat) + (inReserve ? '' : ';' + pointStyle(carrotPoints[rabbit.pos])) + '"';
    if (canMove) return '<button' + attributes + ' data-rabbit="' + rabbit.id + '" aria-label="' + label + '">' + rabbitArt(rabbit) + stamp + '</button>';
    return '<span' + attributes + ' aria-label="' + label + '" role="img">' + rabbitArt(rabbit) + stamp + '</span>';
  }

  function board() {
    const spaces = carrotPoints.slice(1, -1).map((point, index) => {
      const pos = index + 1;
      const open = pos === race.hole;
      const name = open ? 'Trou ouvert' : 'Case ' + pos;
      return '<span role="img" aria-label="' + name + '" class="carrot-space' +
        (open ? ' open' : '') + '" data-space="' + pos + '" style="' + pointStyle(point) + '"></span>';
    }).join('');
    const turning = !busy && race.phase === 'turn';
    const goal = '<button class="carrot-goal" aria-label="Tourner la carotte" data-twist ' +
      (turning ? '' : 'disabled') + ' style="' + pointStyle(carrotPoints[carrotBoard.finish]) + '">' +
      '<span class="carrot-podium"></span>' + carrotArt('goal') + '<span class="carrot-spin-arrow" aria-hidden="true">⟳</span></button>';
    return '<div class="carrot-board" aria-label="La colline de Croque-Carotte">' + path() +
      '<span class="carrot-start" aria-hidden="true" style="' + pointStyle(carrotPoints[0]) + '">➜</span>' +
      spaces + '<div class="carrot-mole" aria-hidden="true" style="' + pointStyle([22, 55]) + '">' +
      carrotArt('mole') + '</div><div class="carrot-gate" aria-hidden="true" style="' + pointStyle([65, 35.5]) + '">' +
      carrotArt('gate') + '</div><div class="carrot-bridge' + (race.bridgeUp ? ' up' : '') +
      '" role="img" aria-label="Pont-levis ' + (race.bridgeUp ? 'levé' : 'baissé') + '" style="' + pointStyle([62.5, 84.5]) + '">' +
      '<span></span>' + carrotArt('bridge') + '</div>' + goal +
      race.rabbits.filter(rabbit => !rabbit.lost && rabbit.pos > 0).map(rabbit => piece(rabbit)).join('') + '</div>';
  }

  function benches() {
    return '<div class="carrot-benches">' + race.players.map(({ rabbits }, seat) => {
      return '<section class="carrot-team' + (race.active === seat ? ' active' : '') + '" style="' + teamStyle(seat) +
        '" aria-label="' + playerLabel(seat) + '">' +
        '<span class="carrot-crest">' + teamAt(seat).symbol + '</span><span class="carrot-team-name">' + (seat + 1) + '</span>' +
        '<div class="carrot-pens">' + rabbits.map(rabbit => {
          const extra = rabbit.pos && !rabbit.lost ? ' on-board' : '';
          return piece(rabbit, 'carrot-reserve' + extra, true);
        }).join('') + '</div></section>';
    }).join('') + '</div>';
  }

  function face(card, seat) {
    if (card === 'carrot') return carrotArt('goal') + '<strong aria-hidden="true">⟳</strong>';
    return carrotArt('rabbit-' + colors[seat]) + '<strong aria-hidden="true">' + card +
      '<i>' + '●'.repeat(card) + '</i></strong>';
  }

  function controls() {
    const showing = presented?.card;
    const back = carrotArt('goal', 'class="carrot-back-art"') + '<span aria-hidden="true">↟</span>';
    const suffix = showing === 'carrot' ? 'Carte carotte' : 'Avance de ' + showing + (showing === 1 ? ' case' : ' cases');
    return '<aside class="carrot-controls" style="' + teamStyle(race.active) + '">' +
      '<div class="carrot-current" aria-label="' + playerLabel(race.active) + '">' +
      carrotArt('rabbit-' + colors[race.active]) + '<strong>Joueur ' + (race.active + 1) +
      '<small>' + teamAt(race.active).symbol + ' ' + teamAt(race.active).name + '</small></strong></div>' +
      '<div class="carrot-deck">' +
      '<button class="carrot-draw" data-draw aria-label="Piocher une carte" ' +
      (race.phase !== 'draw' || busy ? 'disabled' : '') + '>' + back + '</button>' +
      '<div class="carrot-face' + (showing ? ' flipped' : '') + (showing && race.phase === 'draw' ? ' discarded' : '') +
      '" aria-label="' + (showing ? suffix : 'Carte à révéler') +
      '" role="img">' + (showing ? face(showing, presented.seat) : '<span aria-hidden="true">✦</span>') + '</div></div>' +
      '<p class="carrot-instruction" role="status" aria-live="polite">' + stageNotice + '</p></aside>';
  }

  function render() {
    if (session.signal.aborted) return;
    stage.innerHTML = '<div class="carrot-table">' + controls() + board() + benches() + '</div>';
  }

  function wait(ms) {
    if (session.signal.aborted || reducedMotion.matches) return Promise.resolve();
    return new Promise(resolve => {
      const end = () => {
        clearTimeout(timer);
        session.signal.removeEventListener('abort', end);
        resolve();
      };
      const timer = setTimeout(end, ms);
      session.signal.addEventListener('abort', end, { once: true });
    });
  }

  function animate(node, keyframes, duration) {
    if (!node?.animate || reducedMotion.matches || session.signal.aborted) return;
    node.animate(keyframes, { duration, easing: 'ease-out' });
  }

  function advance() {
    race.advance();
    busy = false;
    stageNotice = 'Pioche une carte';
    render();
    if (race.phase === 'end') finish();
    else buttonFocus('[data-draw]');
  }

  async function draw() {
    if (busy || race.phase !== 'draw') return;
    const card = race.draw();
    presented = { card, seat: race.active };
    stageNotice = card === 'carrot' ? 'Tourne la carotte !' : 'Choisis un lapin';
    render();
    tone(card === 'carrot' ? [659, 622, 880] : [330, 494], { spacing: .07 });
    animate(root.querySelector('.carrot-face'), [{ transform: 'rotateY(-90deg) scale(.88)' }, { transform: 'none' }], 270);
    if (card === 'carrot') buttonFocus('[data-twist]');
    else if (race.passBlocked()) {
      busy = true;
      stageNotice = 'Le pont est levé : les lapins attendent';
      render();
      await wait(850);
      if (!session.signal.aborted) advance();
    } else buttonFocus('[data-rabbit]');
  }

  function ghost(rabbit, pos) {
    const space = root.querySelector('.carrot-board');
    const node = document.createElement('div');
    node.className = 'carrot-rabbit carrot-ghost';
    node.style.cssText = teamStyle(rabbit.seat) + ';' + pointStyle(carrotPoints[pos]);
    node.innerHTML = rabbitArt(rabbit);
    space.append(node);
    return node;
  }

  async function jump(node, from, to, duration, kind = 'hop') {
    const end = pointStyle(carrotPoints[to]);
    if (reducedMotion.matches || session.signal.aborted) {
      node.style.cssText += ';' + end;
      return;
    }
    const [[x1, y1], [x2, y2]] = [carrotPoints[from], carrotPoints[to]];
    const flip = x2 < x1 ? ' scaleX(-1)' : '';
    const keyframes = [
      { left: x1 + '%', top: y1 + '%', transform: 'translate(-50%, -83%)' + flip },
      { left: (x1 + x2) / 2 + '%', top: (y1 + y2) / 2 + '%',
        transform: 'translate(-50%, ' + (kind === 'hop' ? '-120%' : '-104%') + ') rotate(' +
          (kind === 'hop' ? '0' : '28') + 'deg)' + flip },
      { left: x2 + '%', top: y2 + '%', transform: 'translate(-50%, -83%)' + flip },
    ];
    animate(node, keyframes, duration);
    node.style.cssText += ';' + end;
    await wait(duration);
  }

  async function fall(node) {
    tone([494, 330, 165], { spacing: .075, duration: .2, wave: 'triangle' });
    animate(node, [
      { transform: 'translate(-50%, -83%) scale(1)', opacity: 1 },
      { transform: 'translate(-50%, -92%) scale(.78)', opacity: 1, offset: .32 },
      { transform: 'translate(-50%, -16%) scale(.22)', opacity: 0 },
    ], 440);
    await wait(400);
    node.remove();
  }

  async function playRabbit(id) {
    if (busy || race.phase !== 'move') return;
    const rabbit = race.rabbits[id];
    const from = rabbit.pos;
    const plan = race.move(rabbit);
    if (!plan) return;
    busy = true;
    root.querySelectorAll('[data-rabbit]').forEach(piece => {
      piece.disabled = true;
      if (Number(piece.dataset.rabbit) === id) piece.style.visibility = 'hidden';
    });
    stageNotice = '';
    root.querySelector('.carrot-instruction').textContent = '';
    const actor = ghost(rabbit, from);
    let pos = from;
    for (const step of plan.steps) {
      tone([466 + step * 16], { duration: .13, volume: .07 });
      await jump(actor, pos, step, 185);
      if (session.signal.aborted) return;
      pos = step;
    }
    if (rabbit.lost) {
      root.querySelector('.carrot-instruction').textContent = 'Plouf !';
      await fall(actor);
    }
    if (session.signal.aborted) return;
    if (race.winner) finish();
    else advance();
  }

  async function twist() {
    if (busy || race.phase !== 'turn') return;
    busy = true;
    const goal = root.querySelector('[data-twist]');
    goal.disabled = true;
    animate(goal.querySelector('img'), [
      { transform: 'rotate(0deg) scale(1)' },
      { transform: 'rotate(32deg) scale(.93)' },
      { transform: 'rotate(11deg) scale(1.03)' },
      { transform: 'rotate(0deg) scale(1)' },
    ], 400);
    tone([160, 205, 300, 580], { spacing: .072, duration: .11, wave: 'triangle' });
    await wait(410);
    if (session.signal.aborted) return;
    const result = race.rotate();
    stageNotice = result.obstacle === 'mole' ? 'La taupe sort !' :
      result.obstacle === 'gate' ? 'Le tourniquet s’ouvre !' : race.bridgeUp ? 'Le pont se lève !' : 'Le pont descend !';
    render();
    const bridge = root.querySelector('.carrot-bridge img');
    animate(bridge, [
      { transform: race.bridgeUp ? 'rotateX(0deg)' : 'rotateX(-68deg)' },
      { transform: race.bridgeUp ? 'rotateX(-68deg)' : 'rotateX(0deg)' },
    ], 360);
    if (race.hole !== null) {
      animate(root.querySelector('[data-space="' + race.hole + '"]'), [{ scale: '.62' }, { scale: '1' }], 300);
    }
    if (result.obstacle === 'mole') {
      const mole = root.querySelector('.carrot-mole img');
      mole.parentElement.classList.add('popped');
      animate(mole, [{ transform: 'translateY(66%) scale(.7)' }, { transform: 'none' }], 360);
      tone([240, 320, 430], { spacing: .07, wave: 'triangle' });
    }
    if (result.obstacle === 'gate') {
      const gate = root.querySelector('.carrot-gate img');
      animate(gate, [{ rotate: '0deg' }, { rotate: '42deg' }, { rotate: '0deg' }], 680);
      tone([360, 396, 315], { spacing: .095, wave: 'triangle' });
    }
    const animations = result.effects.map(async ({ rabbit, kind, from, to }) => {
      const actor = ghost(rabbit, from);
      const actual = root.querySelector('.carrot-board [data-piece="' + rabbit.id + '"]');
      if (actual) actual.style.visibility = 'hidden';
      if (kind === 'hole') await fall(actor);
      else await jump(actor, from, to, 570, kind);
    });
    await Promise.all([wait(570), ...animations]);
    if (!session.signal.aborted) advance();
  }

  function finish() {
    tone([523, 659, 784, 1047, 1319], { spacing: .14, duration: .45 });
    const winner = race.winner;
    const title = winner ? 'Le lapin ' + teamAt(winner.seat).name.toLowerCase() + ' gagne !' : 'La colline est vide';
    stage.innerHTML = '<div class="carrot-finish"><div class="carrot-win"><div class="carrot-win-art" aria-hidden="true">' +
      carrotArt('goal') + (winner ? rabbitArt(winner) : '') + '</div><h2>' + title + '</h2>' +
      '<div class="carrot-options"><button class="carrot-main" data-start>↻ Rejouer</button>' +
      '<button class="secondary" data-setup>Changer les joueurs</button></div></div></div>';
    buttonFocus('[data-start]');
  }

  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const data = button.dataset;
    if (button.id === 'back') {
      session.abort();
      clearInterval(ambient);
      audio?.close().catch(() => {});
      home('[data-detail="carrot"]');
    } else if ('carrotSound' in data) {
      muted = !muted;
      button.textContent = muted ? '🔇 Son' : '♪ Son';
      button.setAttribute('aria-pressed', String(!muted));
      if (muted) audio?.suspend().catch(() => {});
      else tone([494, 660]);
    } else if ('carrotRules' in data) {
      modal.showModal();
    } else if ('count' in data || 'color' in data || 'first' in data) {
      if ('count' in data) {
        count = Number(data.count);
        if (first >= count) first = 0;
      }
      if ('color' in data) {
        const seat = Number(data.color);
        const next = (colors[seat] + 1) % carrotTeams.length;
        const other = colors.indexOf(next);
        [colors[seat], colors[other]] = [colors[other], colors[seat]];
      }
      if ('first' in data) first = Number(data.first);
      setup();
      buttonFocus('[data-' + Object.keys(data)[0] + '="' + Object.values(data)[0] + '"]');
    } else if ('start' in data) start();
    else if ('setup' in data) setup();
    else if ('draw' in data) draw();
    else if ('twist' in data) twist();
    else if ('rabbit' in data) playRabbit(Number(data.rabbit));
  });

  setup();
}
