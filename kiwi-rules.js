const kiwiSize = 4;
const kiwiStock = 10;
const kiwiSeats = [
  { x: 0, y: 1, angle: 0 },
  { x: 0, y: -1, angle: 180 },
  { x: 1, y: 0, angle: -90 },
  { x: -1, y: 0, angle: 90 },
];

function kiwiAim(seat, pull, side, distance) {
  const { x, y } = kiwiSeats[seat];
  const depth = 3.08 + distance * .23 - pull * 5.32;
  const spread = side * 2.85;
  return { x: 2 + x * depth - y * spread, y: 2 + y * depth + x * spread };
}

function kiwiLanding({ x, y }) {
  if (x < 0 || y < 0 || x >= kiwiSize || y >= kiwiSize) return { kind: 'miss' };
  const column = Math.floor(x);
  const row = Math.floor(y);
  const onDivider = value => {
    const nearest = Math.round(value);
    return nearest > 0 && nearest < kiwiSize && Math.abs(value - nearest) <= .051;
  };
  if (onDivider(x) || onDivider(y)) return { kind: 'rim' };
  return { kind: 'cell', index: row * kiwiSize + column };
}

class KiwiRace {
  constructor(teams, practice = false) {
    this.teams = [...teams];
    this.practice = practice;
    this.cells = Array.from({ length: kiwiSize ** 2 }, () => []);
    this.reserve = teams.map(() => kiwiStock);
    this.pending = new Map();
    this.perches = [];
    this.result = null;
    this.id = 0;
  }

  launch(seat, target) {
    if (!Number.isInteger(seat) || seat < 0 || seat >= this.teams.length) return null;
    if (this.result || this.pending.has(seat) || this.reserve[seat] <= 0) return null;
    if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) return null;
    const bird = { id: this.id++, seat, target, ...kiwiLanding(target) };
    this.pending.set(seat, bird);
    if (!this.practice) this.reserve[seat]--;
    return bird;
  }

  land(bird) {
    if (this.result || this.pending.get(bird.seat) !== bird) return false;
    if (bird.kind !== 'miss') this.pending.delete(bird.seat);
    if (bird.kind === 'rim') this.perches.push(bird);
    if (bird.kind === 'cell') this.cells[bird.index].push(bird);
    const square = bird.kind === 'cell' ? this.square(bird.seat, bird.index) : null;
    if (square && !this.practice) {
      this.result = { kind: 'square', winners: [bird.seat], square };
    } else if (!this.practice && !this.pending.size && this.reserve.every(count => count === 0)) {
      const scores = this.score();
      const best = Math.max(...scores);
      this.result = { kind: 'score', scores, winners: scores.flatMap((score, seat) => score === best ? [seat] : []) };
    }
    return true;
  }

  retry(bird) {
    if (this.result || bird.kind !== 'miss' || this.pending.get(bird.seat) !== bird) return;
    this.pending.delete(bird.seat);
    if (!this.practice) this.reserve[bird.seat]++;
  }

  square(seat, index) {
    const row = Math.floor(index / kiwiSize);
    const column = index % kiwiSize;
    for (let r = Math.max(0, row - 1); r <= Math.min(row, kiwiSize - 2); r++) {
      for (let c = Math.max(0, column - 1); c <= Math.min(column, kiwiSize - 2); c++) {
        const corner = r * kiwiSize + c;
        const cells = [corner, corner + 1, corner + kiwiSize, corner + kiwiSize + 1];
        if (cells.every(i => this.cells[i].at(-1)?.seat === seat)) return cells;
      }
    }
    return null;
  }

  score() {
    const scores = this.teams.map(() => 0);
    for (const pile of this.cells) {
      const owner = pile.at(-1)?.seat;
      if (owner !== undefined) scores[owner] += pile.length;
    }
    return scores;
  }
}
