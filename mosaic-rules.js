const mosaicTiles = [
  { id:'r', label:'Carré rouge' }, { id:'y', label:'Hexagone jaune' },
  { id:'g', label:'Losange vert' }, { id:'b', label:'Cercle bleu' },
];

const mosaicBoards = [
  { name:'Papillon', icon:'🦋', color:'#f988ae', pattern:['r.....r','yr...ry','ybrgrby','.gybyg.','..rgr..','..b.b..'] },
  { name:'Caméléon', icon:'🦎', color:'#8ccc6d', pattern:['...gg..','..gygr.','.byygg.','brbyrb.','b..byg.','ry.....'] },
  { name:'Hippocampe', icon:'🌊', color:'#70c9eb', pattern:['...yy..','..bgryg','..byr..','.rry...','..rbg..','...bgg.','..bryg.'] },
  { name:'Poisson', icon:'🐠', color:'#facc65', pattern:['..ry...','.rybr.g','rybggyg','.rbyr.g','..bbr..','...y...'] },
  { name:'Grenouille', icon:'🐸', color:'#98d4af', pattern:['.b...b.','.gy.yg.','.gryrg.','.bybyb.','ry.r.yr','..b.b..'] },
  { name:'Toucan', icon:'🦜', color:'#ff9a70', pattern:['..bryy.','.bbgryr','.bgrry.','..b....','..gg...','.gbyg..','...r...'] },
];

// The four colours double as four distinct shapes.
const mosaicDrawings = [
  { name:'Étoile de mer', pattern:['.y.','yry','r.r'], stars:3 },
  { name:'Fleur', pattern:['.b.','brb','.g.','g..'], stars:4 },
  { name:'Poisson', pattern:['.y..','ybyg','.r..'], stars:4 },
  { name:'Hippocampe', pattern:['.bb','.b.','.gb'], stars:3 },
  { name:'Papillon', pattern:['r.r','ygy','g.g'], stars:4 },
  { name:'Coquillage', pattern:['.g.','gby'], stars:2 },
  { name:'Baleine', pattern:['..y.','bbgb','.by.'], stars:4 },
  { name:'Libellule', pattern:['r.b','.g.','b.r'], stars:3 },
  { name:'Tulipe', pattern:['r.r','.y.','.g.'], stars:2 },
  { name:'Soleil', pattern:['.y.','yby','.y.'], stars:3 },
  { name:'Petit poisson', pattern:['rg'], stars:1 },
  { name:'Bulle', pattern:['b'], stars:1 },
];
const mosaicMasterBoards = [
  [4,1,9,10,8,11], [7,3,8,5,10,1], [6,3,2,5,10,11],
  [2,0,6,5,10,11], [1,8,7,0,5,11], [7,4,9,5,8,11],
];

function mosaicDrawing({ name, pattern, stars = 0 }) {
  return {
    name, stars, width:pattern[0].length, height:pattern.length,
    cells:pattern.flatMap((row, y) => [...row].flatMap((type, x) => type === '.' ? [] : [{ x, y, type, filled:false }])),
  };
}

function mosaicLayout(id, mode) {
  return mode === 'master' ? mosaicMasterBoards[id].map(index => mosaicDrawing(mosaicDrawings[index])) :
    [mosaicDrawing(mosaicBoards[id])];
}

class MosaicGame {
  constructor(ids, mode, first, random = Math.random) {
    this.mode = mode;
    this.players = ids.map(id => ({ id, drawings:mosaicLayout(id, mode) }));
    this.bag = mosaicTiles.flatMap(({ id }) => Array(30).fill(id));
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
    this.center = [];
    this.bowls = [];
    this.discard = [];
    this.fills = 0;
    this.turn = first;
    this.pending = null;
    this.winners = null;
    this.refill();
  }

  refill() {
    this.bowls = Array.from({ length:5 }, () => this.bag.splice(-5));
    this.fills++;
  }

  draft(bowl, type) {
    const source = bowl === -1 ? this.center : this.bowls[bowl];
    if (this.winners || this.pending || !source?.includes(type)) return false;
    const rest = source.filter(tile => tile !== type);
    if (bowl === -1) this.center = rest;
    else {
      this.center.push(...rest);
      this.bowls[bowl] = [];
    }
    this.pending = { seat:this.turn, type, count:source.length - rest.length, placed:false };
    return true;
  }

  matches(drawing, type) {
    return drawing.cells.filter(cell => !cell.filled && cell.type === type);
  }

  options() {
    if (!this.pending || this.pending.placed) return [];
    const { seat, type } = this.pending;
    return this.players[seat].drawings.flatMap((drawing, index) => this.matches(drawing, type).length ? [index] : []);
  }

  place(index, firstCell) {
    if (!this.options().includes(index)) return [];
    const { seat, count, type } = this.pending;
    const drawing = this.players[seat].drawings[index];
    const matches = this.matches(drawing, type);
    if (!matches.length) return [];
    if (matches.includes(firstCell)) {
      matches.splice(matches.indexOf(firstCell), 1);
      matches.unshift(firstCell);
    }
    const filled = matches.slice(0, count);
    for (const cell of filled) cell.filled = true;
    this.pending.count -= filled.length;
    this.pending.placed = true;
    if (this.mode === 'apprentice' && drawing.cells.every(cell => cell.filled)) this.winners = [seat];
    return filled;
  }

  pass() {
    const pending = this.pending;
    if (!pending || this.winners) return 'finished';
    const next = (pending.seat + 1) % this.players.length;
    if (pending.count && next !== this.turn) {
      pending.seat = next;
      pending.placed = false;
      return 'pass';
    }
    this.discard.push(...Array(pending.count).fill(pending.type));
    this.pending = null;
    this.turn = (this.turn + 1) % this.players.length;
    if (this.center.length || this.bowls.some(bowl => bowl.length)) return 'turn';
    if (this.bag.length && (this.mode === 'apprentice' || this.fills < this.players.length)) {
      this.refill();
      return 'refill';
    }
    const best = Math.max(...this.players.map((_, seat) => this.score(seat)));
    this.winners = this.players.flatMap((_, seat) => this.score(seat) === best ? [seat] : []);
    return 'finished';
  }

  score(seat) {
    return this.players[seat].drawings.reduce((sum, drawing) => sum + (this.mode === 'master'
      ? (drawing.cells.every(cell => cell.filled) ? drawing.stars : 0)
      : drawing.cells.filter(cell => cell.filled).length), 0);
  }
}
