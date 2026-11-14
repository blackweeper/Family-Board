const flip7Rules = `
  <h2>Stop ou encore ?</h2>
  <ol>
    <li>Prenez une carte à votre tour. Quand vous avez déjà une carte devant vous, vous pouvez aussi dire <b>Stop</b> pour garder vos points.</li>
    <li>Deux Numéros identiques vous font sauter : vous marquez 0 pour cette manche. Une <b>Seconde Chance</b> annule le doublon puis est défaussée. Une seule protection est permise par joueur.</li>
    <li>Un <b>Stop</b> oblige le joueur ciblé à s’arrêter. <b>Trois à la suite</b> lui impose trois cartes, une à une, jusqu’au troisième tirage, à un doublon fatal ou à un Flip 7. Vous pouvez vous cibler. Une Seconde Chance est utilisable dès sa révélation. Si vous sautez, transmettez les Stop et Trois à la suite déjà révélés aux joueurs encore en jeu.</li>
    <li><b>Sept Numéros différents</b> donnent 15 points supplémentaires et terminent immédiatement la manche. Les Bonus ne font pas partie des sept Numéros.</li>
    <li>Le <b>×2</b> double les Numéros. Les bonus + et les 15 points du Flip 7 s’ajoutent ensuite. En fin de manche, le meilleur total gagne s’il atteint au moins 200. Si plusieurs joueurs partagent le meilleur score, tout le monde rejoue.</li>
  </ol>
  <p>Adaptation illustrée du jeu d’Eric Olsen, édité par The Op Games et Catch Up Games.</p>
  <p><a href="https://media.play-in.com/pdf/rules_games/flip_7_fr.pdf" target="_blank" rel="noopener">Livret français</a></p>`;

const flip7Palette = ['#80E5D7','#FFAC9F','#FFE08A','#BDD0FF','#F7B1D2','#CFEA9B'];
const flip7Mark = ['✷','◆','✴','✦','●','✺'];
const flip7Names = ['Zéro','Un','Deux','Trois','Quatre','Cinq','Six','Sept','Huit','Neuf','Dix','Onze','Douze'];
const flip7Inks = ['#d55581','#7368ad','#567eb2','#da6262','#479c9a','#c77647','#ae57a6','#e7964c','#718c48','#df8a30','#c65152','#5b858e','#466eae'];
const flip7Actions = {
  freeze: ['▣','Stop'],
  three: ['Ⅲ','Trois à la suite'],
  chance: ['♥','Seconde chance'],
};

function flip7Card(card, hidden = false) {
  if (!card || hidden) {
    return '<span class="f7-card f7-card-back" role="img" aria-label="Carte cachée"><span aria-hidden="true">7</span></span>';
  }
  const { kind, value } = card;
  const [glyph, title] = kind === 'number' ? [value, flip7Names[value]] :
    kind === 'add' ? ['+' + value, 'Bonus'] :
    kind === 'double' ? ['×2', 'Double'] : flip7Actions[kind];
  const hue = kind === 'number' ? ' style="--ink:' + flip7Inks[value] + '"' : '';
  return '<span class="f7-card f7-card-' + kind + '" role="img" aria-label="' + title +
    (kind === 'add' ? ' ' + glyph : '') + '"' + hue + '><i aria-hidden="true">✦</i><strong>' + glyph + '</strong><small>' + title + '</small></span>';
}

function flip7Game() {
  const soundtrack = familyMusic();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pending = new Set();
  let count = 4, game, flow, event, banner, decision, inspectedSeat, effectCard;
  let muted = false, audio, running = false, ticket = 0;

  app.innerHTML = '<section class="f7"><div class="f7-bar"><button class="secondary" id="back">← Jeux</button>' +
    '<button class="secondary" data-f7-sound aria-pressed="true">♪ Son</button><button class="secondary" data-f7-rules>? Règles</button></div>' +
    '<div class="f7-stage"></div><dialog class="f7-dialog" aria-label="Règles de Flip 7">' + flip7Rules +
    '<form method="dialog"><button class="f7-primary">Fermer</button></form></dialog></section>';
  const root = app.querySelector('.f7');
  const stage = root.querySelector('.f7-stage');
  const dialog = root.querySelector('.f7-dialog');
  const tag = p => 'Joueur ' + (p.seat + 1);
  const identity = p => '<i aria-hidden="true">' + flip7Mark[p.seat % flip7Mark.length] + '</i><b>' + tag(p) + '</b>';
  const palette = p => 'style="--player:' + flip7Palette[p.seat % flip7Palette.length] + '"';
  const focus = selector => stage.querySelector(selector)?.focus({ preventScroll: true });

  function sound(notes, { length = .21, interval = .085, volume = .07, type = 'triangle' } = {}) {
    if (muted || !window.AudioContext) return;
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    notes.forEach((frequency, i) => {
      const start = audio.currentTime + i * interval;
      const voice = audio.createOscillator();
      const gain = audio.createGain();
      voice.type = type;
      voice.frequency.value = frequency;
      gain.gain.setValueAtTime(.001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + .022);
      gain.gain.exponentialRampToValueAtTime(.001, start + length);
      voice.connect(gain).connect(audio.destination);
      voice.start(start);
      voice.stop(start + length + .01);
    });
  }

  function wait(ms) {
    if (motion.matches) return Promise.resolve();
    return new Promise(resolve => {
      const cancel = () => {
        clearTimeout(timer);
        pending.delete(cancel);
        resolve();
      };
      const timer = setTimeout(cancel, ms);
      pending.add(cancel);
    });
  }

  function reset() {
    ticket++;
    for (const cancel of pending) cancel();
    running = false;
    decision = null;
    banner = null;
    effectCard = null;
  }

  function setup() {
    soundtrack.stop();
    reset();
    game = undefined;
    stage.innerHTML = '<div class="f7-intro"><div class="f7-intro-copy"><h1>Flip 7</h1>' +
      '<p>Stop ou encore ?</p><fieldset><legend>Joueurs</legend><div class="f7-player-count">' +
      [3,4,5,6].map(n => '<button data-f7-count="' + n + '" aria-pressed="' + (count === n) + '">' + n + '</button>').join('') +
      '<label class="f7-more ' + (count > 6 ? 'selected' : '') + '"><select data-f7-more aria-label="Choisir de 7 à 18 joueurs">' +
      '<option value="">7–18</option>' + Array.from({ length: 12 }, (_, i) => {
        const n = i + 7;
        return '<option value="' + n + '"' + (count === n ? ' selected' : '') + '>' + n + ' joueurs</option>';
      }).join('') + '</select></label></div></fieldset><button data-f7-start class="f7-primary">▶ Jouer</button></div></div>';
  }

  function start() {
    reset();
    game = new Flip7Game(count);
    soundtrack.start('flip7');
    flow = game.play();
    sound([293, 440, 587, 740]);
    drive();
  }

  function hand(p) {
    const hidden = p.status !== 'playing';
    const numbers = p.numbers.concat(p.status === 'bust' ? p.extra : []);
    const bonusCards = p.bonuses.concat(p.chance ?? []);
    const status = { banked: 'Stop', frozen: 'Bloqué', bust: 'Doublon' }[p.status];
    const active = p === (decision?.p ?? event?.p ?? game.actor);
    return '<article class="f7-hand" data-rack="' + p.seat + '" data-status="' + p.status + '" data-active="' + active + '" ' + palette(p) +
      '><header><span class="f7-identity">' + identity(p) + '</span><span class="f7-hand-total" aria-label="' + p.total + ' points au total">' + p.total +
      '<small> pts</small></span></header>' +
      '<div class="f7-rack" aria-label="Cartes du joueur">' +
      (numbers.length ? numbers.map(card => flip7Card(card, hidden)).join('') : '<span class="f7-no-cards" aria-hidden="true">✧</span>') +
      '</div><footer class="f7-hand-bottom"><div class="f7-modifiers">' +
      bonusCards.map(card => card.kind === 'chance' ? (hidden ? flip7Card(card,true) :
        '<span class="f7-pill-effect" data-kind="chance">' + flip7Actions.chance[1] + '</span>') :
        flip7Card(card)).join('') +
      (p.status === 'frozen' ? '<span class="f7-pill-effect" data-kind="freeze">▣ Stop</span>' : '') +
      '</div><span class="f7-current-score" aria-label="' + game.amount(p) + ' points pour la manche">' +
      (status ? '<small>' + status + ' · </small>' : '') + '+' + game.amount(p) + '</span></footer></article>';
  }

  function compact(p, inspected) {
    const state = { banked: 'Stop', frozen: 'Bloqué', bust: 'Doublon' }[p.status] || (p.numbers.length + '/7');
    return '<button class="f7-seat-picker" data-f7-peek="' + p.seat + '" ' + palette(p) + ' aria-pressed="' +
      (p === inspected) + '">' + identity(p) + '<span>' + p.total + ' pts</span><small>' + state + '</small></button>';
  }

  function renderBoard() {
    const table = game.players;
    const speaker = decision?.p ?? event?.p ?? game.actor;
    const large = table.length > 6;
    const inspected = table[inspectedSeat] ?? speaker ?? table[(game.dealer + 1) % table.length];
    const targetMode = decision?.type === 'target';
    const controls = decision?.type === 'turn'
      ? '<div class="f7-buttons"><button class="f7-primary" data-f7-draw>↗ Encore</button>' +
        '<button class="f7-stop" data-f7-stop ' + (decision.canStop ? '' : 'disabled') + '>▣ Stop</button></div>'
      : targetMode
        ? '<div class="f7-candidates">' + decision.candidates.map(p => '<button data-f7-target="' + p.seat +
          '" ' + palette(p) + '>' + identity(p) + '</button>').join('') + '</div>'
        : '';
    const prompt = decision?.type === 'turn' ? tag(speaker) + (decision.canStop ? ' · Stop ou encore ?' : ' · Première carte') :
      targetMode ? tag(speaker) + ' · Choisis un joueur' : banner?.title || (speaker ? tag(speaker) : '');
    const countMarks = speaker && !targetMode && event?.type !== 'start'
      ? '<div class="f7-countmarks" aria-label="' + speaker.numbers.length + ' numéros sur 7">' +
        Array.from({ length: 7 }, (_, i) => '<i class="' + (i < speaker.numbers.length ? 'filled' : '') + '"></i>').join('') + '</div>'
      : '';
    stage.innerHTML = '<div class="f7-table" data-count="' + count + '" data-event="' + (banner?.kind ?? '') +
      '"><div class="f7-meta"><span>Manche <b>' +
      game.round + '</b></span><span>Objectif <b>200</b></span></div>' +
      '<div class="f7-center" ' + (speaker ? palette(speaker) : '') + '><div class="f7-deck" aria-hidden="true">' +
      flip7Card(null) + '</div><div class="f7-prompt"><strong role="status">' + prompt + '</strong>' +
      '<div class="f7-focus-card">' + (targetMode ? flip7Card(decision.card) : effectCard ? flip7Card(effectCard) : '') + '</div>' + countMarks +
      controls + '</div></div>' +
      (large
        ? '<div class="f7-large-hand">' + hand(inspected) + '</div><div class="f7-seat-list" aria-label="Tous les joueurs">' +
          table.map(p => compact(p, inspected)).join('') + '</div>'
        : '<div class="f7-hands">' + table.map(hand).join('') + '</div>') + '</div>';
    if (large) {
      const seatButton = stage.querySelector('.f7-seat-picker[aria-pressed="true"]');
      const list = stage.querySelector('.f7-seat-list');
      list.scrollLeft = seatButton.offsetLeft - list.offsetLeft - (list.clientWidth - seatButton.clientWidth) / 2;
    }
  }

  async function deal(p, card) {
    const board = stage.querySelector('.f7-table');
    const source = board.querySelector('.f7-deck').getBoundingClientRect();
    const rack = board.querySelector('[data-rack="' + p.seat + '"] .f7-rack');
    const destination = (rack ?? board.querySelector('.f7-prompt')).getBoundingClientRect();
    const flyer = document.createElement('div');
    flyer.className = 'f7-flyer';
    flyer.setAttribute('aria-hidden', 'true');
    flyer.innerHTML = flip7Card(null) + flip7Card(card);
    flyer.style.left = source.left + source.width / 2 + 'px';
    flyer.style.top = source.top + source.height / 2 + 'px';
    const rackStyle = rack && getComputedStyle(rack);
    const size = rackStyle ? Math.min(destination.width / 8, parseFloat(rackStyle.getPropertyValue('--card-max'))) : 0;
    const targetX = rack && card.kind === 'number'
      ? destination.left + size / 2 + (size + parseFloat(rackStyle.columnGap)) * p.numbers.length
      : destination.left + destination.width / 2;
    const x = targetX - source.left - source.width / 2;
    const y = destination.top + destination.height / 2 - source.top - source.height / 2;
    flyer.style.setProperty('--flight-x', x + 'px');
    flyer.style.setProperty('--flight-y', y + 'px');
    board.append(flyer);
    sound([293, 523], { interval: .045, volume: .045 });
    await wait(420);
    flyer.remove();
  }

  const effects = {
    saved: ['Seconde chance !', [392, 587, 784]],
    bust: ['Doublon !', [392, 277, 175]],
    flip: ['Flip 7 · +15 !', [392, 494, 587, 784, 988, 1175, 1568]],
    chance: ['Seconde chance prête', [440, 659, 880]],
    frozen: ['Stop imposé', [415, 350, 247]],
    banked: ['Points à l’abri', [440, 587]],
    three: ['Trois à la suite !', [294, 440, 587]],
    discard: ['Carte défaussée', [261, 196]],
    shuffle: ['La défausse est mélangée', [247, 330, 392]],
  };

  function celebrate(p) {
    if (motion.matches) return;
    const table = stage.querySelector('.f7-table');
    const burst = document.createElement('div');
    burst.className = 'f7-confetti';
    burst.setAttribute('aria-hidden', 'true');
    burst.setAttribute('style', '--player:' + flip7Palette[p.seat % flip7Palette.length]);
    for (let i = 0; i < 30; i++) {
      const bit = document.createElement('i');
      const angle = i / 30 * Math.PI * 2;
      const radius = 96 + (i % 6) * 23;
      bit.style.cssText = '--x:' + Math.cos(angle) * radius + 'px;--y:' + Math.sin(angle) * radius +
        'px;--delay:' + (i % 4) * 29 + 'ms;--spin:' + (210 + i * 41) + 'deg';
      burst.append(bit);
    }
    table.append(burst);
  }

  async function drive(answer) {
    if (running) return;
    running = true;
    const run = ticket;
    decision = null;
    let next = flow.next(answer);
    while (!next.done && run === ticket) {
      event = next.value;
      inspectedSeat = null;
      banner = null;
      effectCard = null;
      if (event.type === 'turn' || event.type === 'target') {
        decision = event;
        renderBoard();
        focus(event.type === 'turn' ? '[data-f7-draw]' : '[data-f7-target]');
        running = false;
        return;
      }
      if (event.type === 'summary') {
        summary(event.tie);
        running = false;
        return;
      }
      if (event.type === 'start') {
        banner = { kind: 'start', title: 'Manche ' + game.round };
        renderBoard();
        await wait(365);
      } else if (event.type === 'deal') {
        if (event.forced) banner = { kind: 'three', title: 'Tirage imposé · ' + (4 - event.forced) + ' / 3' };
        renderBoard();
        await deal(event.p, event.card);
      } else {
        const [title, notes] = effects[event.type];
        banner = { kind: event.type, title: (event.p ? tag(event.p) + ' · ' : '') + title };
        if (event.type === 'saved' || event.type === 'bust' || event.type === 'frozen') effectCard = event.card;
        renderBoard();
        if (event.type === 'flip') celebrate(event.p);
        sound(notes, { length: event.type === 'flip' ? .35 : .21 });
        await wait(event.type === 'flip' ? 1100 : event.type === 'three' ? 465 : 570);
      }
      if (run !== ticket) return;
      next = flow.next();
    }
    running = false;
  }

  function summary(tie) {
    if (game.winner) soundtrack.stop();
    const standings = [...game.players].sort((a, b) => b.total - a.total || b.gain - a.gain || a.seat - b.seat);
    const title = game.winner ? tag(game.winner) + ' gagne !' : tie ? 'Égalité en tête' : 'Fin de manche';
    stage.innerHTML = '<div class="f7-summary"><div class="f7-scoreboard"><h2>' + title + '</h2>' +
      '<p>' + (game.winner ? game.winner.total + ' points' : tie ? 'Tout le monde joue une nouvelle manche.' :
        game.flip ? tag(game.flip) + ' a réalisé un Flip 7 !' : 'Manche ' + game.round) + '</p>' +
      '<div class="f7-standings" role="list">' + standings.map((p, i) => '<div role="listitem" ' + palette(p) +
        ' data-first="' + (p === game.winner) + '"><span class="f7-identity">' + identity(p) +
        '</span><span class="f7-gain" style="--delay:' + Math.min(i, 8) * 37 + 'ms">+' + p.gain +
        '</span><strong>' + p.total + '</strong></div>').join('') + '</div>' +
      '<div class="f7-buttons">' + (game.winner
        ? '<button class="f7-primary" data-f7-start>↻ Rejouer</button><button class="secondary" data-f7-setup>Joueurs</button>'
        : '<button class="f7-primary" data-f7-next>Manche suivante →</button>') + '</div></div></div>';
    sound(game.winner ? [392,494,587,784,988] : [294,392,523], { length: .31 });
    focus(game.winner ? '[data-f7-start]' : '[data-f7-next]');
  }

  root.addEventListener('change', e => {
    if (!e.target.matches('[data-f7-more]') || !e.target.value) return;
    count = Number(e.target.value);
    setup();
    focus('[data-f7-more]');
  });
  root.addEventListener('click', e => {
    const button = e.target.closest('button');
    if (!button || button.disabled) return;
    const data = button.dataset;
    if (button.id === 'back') {
      reset();
      soundtrack.close();
      audio?.close().catch(() => {});
      home('[data-detail="flip7"]');
    } else if ('f7Sound' in data) {
      muted = !muted;
      soundtrack.mute(muted);
      button.textContent = muted ? '🔇 Son' : '♪ Son';
      button.setAttribute('aria-pressed', String(!muted));
      if (muted) audio?.suspend().catch(() => {});
      else sound([523, 659]);
    } else if ('f7Rules' in data) dialog.showModal();
    else if ('f7Count' in data) {
      count = Number(data.f7Count);
      setup();
      focus('[data-f7-count="' + count + '"]');
    } else if ('f7Start' in data) start();
    else if ('f7Setup' in data) setup();
    else if ('f7Next' in data) drive();
    else if (decision?.type === 'turn') {
      if ('f7Draw' in data) drive('draw');
      else if ('f7Stop' in data) drive('stop');
      else if ('f7Peek' in data) {
        inspectedSeat = Number(data.f7Peek);
        renderBoard();
        focus('[data-f7-peek="' + inspectedSeat + '"]');
      }
    } else if (decision?.type === 'target' && 'f7Target' in data) {
      const target = decision.candidates.find(p => p.seat === Number(data.f7Target));
      if (target) drive(target);
    }
  });

  setup();
}
