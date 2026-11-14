const archeoFossils = [
  { name:'Stégosaure', groups:[[0,1],[2,3]] },
  { name:'Tricératops', groups:[[0,1],[2,3]] },
  { name:'Reptile marin', groups:[[0,1],[2,3]] },
  { name:'Tyrannosaure', groups:[[0,1,2]] },
  { name:'Ammonite', groups:[[0]] },
];
const archeoDepth = ['Sable','Terre claire','Terre profonde','Cavités'];
const archeoTools = [0,8,11,10,9,8];

function archeoShuffle(items, random) {
  const deck = [...items];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

class ArcheoGame {
  constructor(count, first = 0, random = Math.random) {
    this.count = count;
    this.turn = first;
    this.maxTools = archeoTools[count];
    this.tools = this.maxTools;
    this.carts = Array(count).fill(count === 1 ? 2 : 1);
    this.found = archeoFossils.map(() => new Set());
    this.egg = false;
    this.pending = null;
    this.phase = 'dig';

    const specimens = archeoFossils.flatMap(({groups}, fossil) => groups.flatMap(parts => parts.map(part => ({kind:'fossil', fossil, part}))));
    const make = (kind, amounts) => amounts.map(amount => ({kind, amount}));
    const sand = [...make('cart',[1,1,1]), ...make('peek',[1,1]),
      ...make('repair',[1,1,2]), ...make('rock',[1,1,1,1,1,1,2,2,2,2])];
    const mixed = archeoShuffle(specimens,random);
    sand.push(...mixed.slice(0,7));
    const soil = [...mixed.slice(7), ...make('cart',[1,1]), ...make('peek',[1,1,1]), ...make('repair',[1,1,1,2]),
      ...make('rock',[1,1,1,1,2,2,2])];
    const decks = [archeoShuffle(sand,random),archeoShuffle(soil,random),archeoShuffle(make('egg',[2]).concat(make('shell',[0,0]),make('rock',[2])),random)];
    this.tiles = [5,4,3,2].flatMap((size, level) => Array.from({length:size*size},(_,i) => ({
      ...decks[level === 0 ? 0 : level === 3 ? 2 : 1].pop(), id:`${level}-${i}`, level,
      x:(5-size)/2 + i%size, y:(5-size)/2 + Math.floor(i/size), dug:false, hint:false,
    })));
    // Offset strata require clearing every overlying corner before a tile can be lifted.
    for (const tile of this.tiles) {
      tile.above = this.tiles.filter(other => other.level < tile.level && Math.abs(other.x-tile.x)<1 && Math.abs(other.y-tile.y)<1);
    }
    const candidates = this.tiles.filter(tile => tile.kind === 'fossil' && tile.level > 0);
    for (const fossil of archeoShuffle(candidates,random)) {
      const cover = fossil.above.find(tile => tile.level === fossil.level - 1 && !tile.hint);
      if (cover) cover.hint = 'fossil';
      if (this.tiles.filter(tile => tile.hint).length === 3) break;
    }
    const hazards = this.tiles.filter(tile => tile.level < 2 && tile.kind === 'rock' && !tile.hint);
    for (const hazard of archeoShuffle(hazards,random).slice(0,4)) hazard.hint = 'rock';
  }

  accessible() {
    return this.tiles.filter(tile => !tile.dug && tile.above.every(other => other.dug));
  }

  select(id) {
    if (this.phase !== 'dig' && this.phase !== 'peek') return null;
    const tile = this.accessible().find(item => item.id === id);
    if (!tile) return null;
    if (this.phase === 'peek') {
      this.phase = 'seen';
      return tile;
    }
    tile.dug = true;
    this.phase = 'reveal';
    this.pending = tile;
    return tile;
  }

  resolve(protect = false) {
    const tile = this.pending;
    if (!tile || !['reveal','risk'].includes(this.phase)) return;
    if (tile.kind === 'rock' && this.carts[this.turn] && this.phase === 'reveal') {
      this.phase = 'risk';
      return;
    }
    switch (tile.kind) {
      case 'fossil': this.found[tile.fossil].add(tile.part); break;
      case 'cart': this.carts[this.turn]++; break;
      case 'repair': this.tools = Math.min(this.maxTools,this.tools + tile.amount); break;
      case 'egg': this.egg = true; break;
      case 'rock':
        if (protect && this.carts[this.turn]) this.carts[this.turn]--;
        else this.tools = Math.max(0,this.tools - tile.amount);
        break;
      case 'peek':
        if (this.accessible().length) { this.phase = 'peek'; return; }
        break;
    }
    this.phase = 'result';
  }

  fossilScore(index) {
    return archeoFossils[index].groups.filter(group => group.every(part => this.found[index].has(part))).length;
  }

  get score() {
    return archeoFossils.reduce((sum,_,index) => sum + this.fossilScore(index),this.egg ? 2 : 0);
  }

  advance() {
    if (!['result','seen'].includes(this.phase)) return;
    this.pending = null;
    if (!this.tools || this.score === 10) this.phase = 'finished';
    else {
      this.turn = (this.turn + 1) % this.count;
      this.phase = 'dig';
    }
  }
}
