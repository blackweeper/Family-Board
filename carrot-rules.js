const carrotBoard = Object.freeze({
  start: 0,
  finish: 26,
  mole: 3,
  bridge: 13,
  gate: 23,
  landing: 9,
});

const carrotCards = [
  ...Array(24).fill(1),
  ...Array(8).fill(2),
  ...Array(4).fill(3),
  ...Array(12).fill('carrot'),
];

// The booklet describes what each obstacle does, without specifying the cam's
// sequence. A repeating cycle keeps the holes tied to the carrot, not the cards.
const carrotMechanism = [
  [5], [12, 'mole'], [16], [21, 'gate'],
  [7, 'mole'], [10], [18], [24, 'gate'],
  [20], [null, 'mole'], [9, 'gate'], [16],
  [12], [18, 'mole'], [21], [5, 'gate'],
  [10], [7, 'mole'], [24], [null, 'gate'],
  [16, 'mole'], [20], [12, 'gate'], [18],
];

function carrotShuffle(cards, random) {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

class CarrotRace {
  constructor(colors, first, random = Math.random) {
    this.random = random;
    this.players = colors.map((color, seat) => ({
      color,
      rabbits: Array.from({ length: 4 }, (_, number) => ({
        id: seat * 4 + number,
        seat,
        number,
        pos: carrotBoard.start,
        lost: false,
      })),
    }));
    this.rabbits = this.players.flatMap(player => player.rabbits);
    this.active = first;
    this.hole = null;
    this.bridgeUp = false;
    this.turns = 0;
    this.clicks = 0;
    this.phase = 'draw';
    this.card = null;
    this.winner = null;
    this.deck = carrotShuffle(carrotCards, this.random);
    this.discard = [];
  }

  at(pos) {
    return this.rabbits.find(rabbit => !rabbit.lost && rabbit.pos === pos);
  }

  draw() {
    if (this.phase !== 'draw') return null;
    if (!this.deck.length) {
      this.deck = carrotShuffle(this.discard, this.random);
      this.discard = [];
    }
    this.card = this.deck.pop();
    this.discard.push(this.card);
    this.phase = this.card === 'carrot' ? 'turn' : 'move';
    return this.card;
  }

  plan(rabbit) {
    if (this.phase !== 'move' || rabbit.seat !== this.active || rabbit.lost) return null;
    const steps = [];
    let next = rabbit.pos;
    let blocked = false;
    while (steps.length < this.card && next < carrotBoard.finish) {
      if (next === carrotBoard.bridge && this.bridgeUp) {
        blocked = true;
        break;
      }
      next++;
      if (!this.at(next)) steps.push(next);
    }
    return { rabbit, steps, blocked, to: steps.at(-1) ?? rabbit.pos };
  }

  move(rabbit) {
    const plan = this.plan(rabbit);
    if (!plan?.steps.length) return null;
    rabbit.pos = plan.to;
    if (plan.to === carrotBoard.finish) {
      this.winner = rabbit;
      this.phase = 'end';
    } else {
      rabbit.lost = plan.to === this.hole;
      this.phase = 'resolved';
    }
    return plan;
  }

  moves() {
    return this.players[this.active].rabbits.map(rabbit => this.plan(rabbit)).filter(plan => plan?.steps.length);
  }

  passBlocked() {
    if (this.phase !== 'move' || this.moves().length) return false;
    this.phase = 'resolved';
    return true;
  }

  rotate() {
    if (this.phase !== 'turn') return null;
    const [hole, obstacle = 'bridge'] = carrotMechanism[this.clicks % carrotMechanism.length];
    this.clicks++;
    this.hole = hole;
    this.bridgeUp = !this.bridgeUp;
    const effects = [];
    const trapped = this.at(hole);
    if (trapped) {
      trapped.lost = true;
      effects.push({ kind: 'hole', rabbit: trapped, from: hole, to: hole });
    }
    if (obstacle === 'mole') {
      const rabbit = this.at(carrotBoard.mole);
      if (rabbit) {
        rabbit.pos = carrotBoard.start;
        effects.push({ kind: 'mole', rabbit, from: carrotBoard.mole, to: carrotBoard.start });
      }
    }
    if (obstacle === 'gate') {
      const rabbit = this.at(carrotBoard.gate);
      if (rabbit) {
        let landing = carrotBoard.landing;
        while (landing === this.hole || this.at(landing)) landing++;
        rabbit.pos = landing;
        effects.push({ kind: 'gate', rabbit, from: carrotBoard.gate, to: landing });
      }
    }
    this.phase = 'resolved';
    return { obstacle, effects };
  }

  advance() {
    if (this.phase !== 'resolved') return;
    for (let offset = 1; offset <= this.players.length; offset++) {
      const seat = (this.active + offset) % this.players.length;
      if (this.players[seat].rabbits.some(rabbit => !rabbit.lost)) {
        this.active = seat;
        this.phase = 'draw';
        this.turns++;
        return;
      }
    }
    this.phase = 'end';
  }
}
