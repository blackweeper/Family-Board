const flip7Goal = 200;
const flip7Bonus = 15;
const flip7Specials = ['freeze', 'three', 'chance'];

function flip7Deck() {
  const deck = [];
  const add = (kind, value, copies = 1) => {
    for (let i = 0; i < copies; i++) deck.push({ id: deck.length, kind, value });
  };
  for (let number = 0; number <= 12; number++) add('number', number, Math.max(1, number));
  for (const value of [2, 4, 6, 8, 10]) add('add', value);
  add('double', 2);
  for (const kind of flip7Specials) add(kind, null, 3);
  return deck;
}

function flip7Shuffle(cards, random) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

class Flip7Game {
  constructor(count, { random = Math.random, dealer, deck } = {}) {
    this.players = Array.from({ length: count }, (_, seat) => ({ seat, total: 0 }));
    this.random = random;
    this.dealer = dealer ?? Math.floor(random() * count);
    this.deck = deck ?? flip7Shuffle(flip7Deck(), random);
    this.discard = [];
    this.round = 0;
    this.actor = null;
    this.flip = null;
    this.winner = null;
    this.inPlay = [];
  }

  amount(player) {
    if (player.status === 'bust') return 0;
    const base = player.numbers.reduce((sum, card) => sum + card.value, 0);
    const modifier = player.bonuses.reduce((sum, card) => sum + (card.kind === 'add' ? card.value : 0), 0);
    return base * (player.bonuses.some(card => card.kind === 'double') ? 2 : 1) +
      modifier + (player === this.flip ? flip7Bonus : 0);
  }

  resetRound() {
    this.round++;
    this.flip = null;
    this.actor = null;
    this.inPlay = [];
    for (const p of this.players) Object.assign(p, {
      status: 'playing', numbers: [], bonuses: [], chance: null, extra: [], gain: 0,
    });
  }

  *take(p, forced) {
    if (!this.deck.length && this.discard.length) {
      this.deck = flip7Shuffle(this.discard, this.random);
      this.discard = [];
      yield { type: 'shuffle' };
    }
    const card = this.deck.pop();
    if (!card) return null;
    this.inPlay.push(card);
    yield { type: 'deal', p, card, forced };
    return card;
  }

  throwAway(card) {
    this.inPlay.splice(this.inPlay.indexOf(card), 1);
    this.discard.push(card);
  }

  *select(p, card, candidates) {
    if (!candidates.length) return null;
    if (candidates.length === 1) return candidates[0];
    return yield { type: 'target', p, card, candidates };
  }

  *accept(p, card) {
    if (card.kind === 'number') {
      if (p.numbers.some(existing => existing.value === card.value)) {
        if (p.chance) {
          this.throwAway(p.chance);
          this.throwAway(card);
          p.chance = null;
          yield { type: 'saved', p, card };
        } else {
          p.status = 'bust';
          p.extra.push(card);
          yield { type: 'bust', p, card };
        }
      } else {
        p.numbers.push(card);
        if (p.numbers.length === 7) {
          this.flip = p;
          yield { type: 'flip', p, card };
        }
      }
    } else if (card.kind === 'chance') {
      const recipient = p.chance
        ? yield* this.select(p, card, this.players.filter(other => other.status === 'playing' && !other.chance))
        : p;
      if (recipient) {
        recipient.chance = card;
        yield { type: 'chance', p: recipient, card };
      } else {
        this.throwAway(card);
        yield { type: 'discard', p, card };
      }
    } else {
      p.bonuses.push(card);
    }
  }

  *resolve(p, initial) {
    const queue = [{ card: initial, source: p }];
    while (queue.length && this.flip === null) {
      const { card, source } = queue.shift();
      const target = yield* this.select(source, card, this.players.filter(other => other.status === 'playing'));
      if (!target) {
        this.throwAway(card);
      } else if (card.kind === 'freeze') {
        target.status = 'frozen';
        target.extra.push(card);
        yield { type: 'frozen', p: target, card };
      } else {
        yield { type: 'three', p: target, card };
        const deferred = [];
        for (let remaining = 3; remaining && target.status === 'playing' && this.flip === null; remaining--) {
          const drawn = yield* this.take(target, remaining);
          if (!drawn) break;
          if (drawn.kind === 'freeze' || drawn.kind === 'three') deferred.push(drawn);
          else yield* this.accept(target, drawn);
        }
        this.throwAway(card);
        // The linked French booklet has a player who busts pass on the deferred actions.
        queue.push(...deferred.map(drawn => ({ card: drawn, source: target })));
      }
    }
  }

  *play() {
    while (this.winner === null) {
      this.resetRound();
      yield { type: 'start' };
      let seat = this.dealer;
      while (this.flip === null && this.players.some(p => p.status === 'playing')) {
        seat = (seat + 1) % this.players.length;
        const p = this.players[seat];
        if (p.status !== 'playing') continue;
        this.actor = p;
        const canStop = !!(p.numbers.length || p.bonuses.length || p.chance);
        const answer = yield { type: 'turn', p, canStop };
        if (answer === 'stop' && canStop) {
          p.status = 'banked';
          yield { type: 'banked', p };
        } else {
          const card = yield* this.take(p);
          if (!card) break; // Finite physical supply, including face-down cards still on the table.
          if (card.kind === 'freeze' || card.kind === 'three') yield* this.resolve(p, card);
          else yield* this.accept(p, card);
        }
      }
      this.actor = null;
      for (const p of this.players) {
        p.gain = this.amount(p);
        p.total += p.gain;
      }
      const best = Math.max(...this.players.map(p => p.total));
      const leaders = this.players.filter(p => p.total === best);
      if (best >= flip7Goal && leaders.length === 1) this.winner = leaders[0];
      yield { type: 'summary', tie: best >= flip7Goal && leaders.length > 1 };
      this.discard.push(...this.inPlay);
      this.dealer = (this.dealer + 1) % this.players.length;
    }
  }
}
