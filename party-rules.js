function partyShuffle(items, random) {
  const cards = [...items];
  for (let i = cards.length - 1; i > 0; i--) {
    const next = Math.floor(random() * (i + 1));
    [cards[i], cards[next]] = [cards[next], cards[i]];
  }
  return cards;
}

const sharkFood = ['Sucette de méduse','Salade d’algues','Plateau de crustacés','Poisson jaune','Sushi bleu','Bouteille de pirate','Arête','Trésor','Trident'];
const sharkVariants = ['Grosse faim','Super larcin','Grosse vague','Amas d’arêtes'];

class SharkFeast {
  constructor(count, variants = [], random = Math.random) {
    this.variants = new Set(variants);
    this.deck = partyShuffle([8,7,6,6,6,4,4,4,5].flatMap((total,kind) => Array(total).fill(kind)),random);
    this.players = Array.from({length:count},()=>({ cards:[], hungry:false }));
    this.piles = Array.from({length:count === 2 ? 4 : count + 1},(_,i)=>[{ kind:this.deck.pop(), visible:i%2===0 || this.variants.has(2) }]);
    this.round = 1;
    this.winners = null;
  }

  tally(seat) {
    const counts = Array(9).fill(0);
    for (const card of this.players[seat].cards) counts[card]++;
    const pair = amount => amount >= 2 ? amount+1 : 0;
    const bones = this.variants.has(3) && counts[6] && this.players.every(p => p.cards.filter(c=>c===6).length <= counts[6]);
    return counts[0] + counts[1]*2 + Math.min(counts[2],this.variants.has(0)?2:1)*3 + pair(counts[3]) + pair(counts[4]) + (bones ? 5 : 0);
  }

  *collect(seat, kind) {
    const player = this.players[seat];
    yield { type:'card', seat, kind };
    if (kind === 5) player.hungry = true;
    else if (kind === 7) {
      if (this.variants.has(1)) {
        const options = this.players.flatMap((p,i)=>i===seat || !p.cards.length ? [] : [i]);
        if (options.length) {
          const { from, index } = yield {type:'steal',seat,options};
          yield* this.collect(seat,this.players[from].cards.splice(index,1)[0]);
        }
      } else if (this.deck.length) yield* this.collect(seat,this.deck.pop());
    } else if (kind !== 6 || this.variants.has(3)) {
      player.cards.push(kind);
      if (kind === 8 && player.cards.filter(c=>c===8).length === 5) this.winners = [seat];
    }
  }

  *resolve(choices) {
    for (const p of this.players) p.hungry=false;
    for (const [index,pile] of this.piles.entries()) {
      const votes = choices.map(list=>list.filter(i=>i===index).length);
      const highest = Math.max(...votes);
      if (!highest || !pile.length) continue;
      const owners = votes.flatMap((amount,seat)=>amount===highest ? [seat] : []);
      yield { type:'bite', index, owners };
      if (owners.length !== 1) continue;
      this.piles[index]=[];
      for (const { kind } of pile) {
        yield* this.collect(owners[0],kind);
        if (this.winners) return;
      }
    }
    if (this.deck.length < this.piles.length) {
      const scores = this.players.map((_,seat)=>this.tally(seat));
      const high = Math.max(...scores);
      const winners = scores.flatMap((n,seat)=>n===high ? [seat] : []);
      const hungry = winners.filter(seat=>this.players[seat].hungry);
      this.winners = hungry.length === 1 ? hungry : winners;
      return;
    }
    this.round++;
    for (const pile of this.piles) pile.push({kind:this.deck.pop(),visible:this.variants.has(2) || !pile.at(-1)?.visible});
    yield { type:'tide' };
  }
}

const mudTrack = ['mud1','draw1','extra','mud2','barn','wash','mud1','wild','mud3','swap','draw3','mud2','barn','extra','mud1','wash'];
const mudCards = [1,1,2,2,3,3,4,4,5,5,'joker'];

class MudDive {
  constructor(avatars, first, random = Math.random) {
    this.random=random;
    this.turn=first;
    this.goal=avatars.length===4 ? 12 : 16;
    this.players=avatars.map(id=>({id,pos:-1,mud:0,discard:[],deck:partyShuffle(mudCards,random),hand:[]}));
    for (const player of this.players) this.draw(player,3);
    this.phase='choose';
    this.winners=[];
  }

  draw(player, howMany) {
    for (let i=0;i<howMany && player.hand.length<3;i++) {
      const card=this.take(player);
      if (card!==undefined) player.hand.push(card);
    }
  }

  take(player) {
    if (!player.deck.length) player.deck=partyShuffle(player.discard.splice(0),this.random);
    return player.deck.pop();
  }

  participant() { return this.players[this.turn]; }

  select(index) {
    const player=this.participant();
    if (this.phase!=='choose' || index<0 || index>=player.hand.length) return null;
    return this.play(player.hand.splice(index,1)[0]);
  }

  play(card) {
    if (card===undefined) return null;
    this.participant().discard.push(card);
    if (card==='joker') { this.phase='joker'; return null; }
    return this.move(card);
  }

  move(amount) {
    const player=this.participant();
    let pos=player.pos;
    const path=[];
    for (let i=0;i<amount;i++) { pos=(pos+1)%mudTrack.length; path.push(pos); }
    while (this.players.some(other=>other!==player && other.pos===pos)) { pos=(pos+1)%mudTrack.length; path.push(pos); }
    this.phase='moving';
    return path;
  }

  gain(seat,amount) { this.players[seat].mud=Math.min(this.goal,this.players[seat].mud+amount); }

  land() {
    const player=this.participant();
    const event=mudTrack[player.pos];
    if (!event) { this.end(); return 'end'; }
    this.phase=event;
    const before=this.players.map(p=>p.mud);
    if (event.startsWith('mud')) this.gain(this.turn,Number(event.at(-1)));
    else if (event.startsWith('draw')) this.draw(player,Number(event.at(-1)));
    else if (event==='wash') {
      this.players.forEach((p,seat)=>{
        if (seat!==this.turn && p.mud%4) { p.mud--; this.gain(this.turn,1); }
      });
    }
    return {event,gains:this.players.map((p,seat)=>p.mud-before[seat])};
  }

  swap(seat) {
    const player=this.participant(), other=this.players[seat];
    [player.pos,other.pos]=[other.pos,player.pos];
    this.phase='moving';
  }

  splash(power) {
    const drops=[];
    const amount=Math.floor(this.random()*4 + power*5);
    for (let i=0;i<amount;i++) {
      const field=Math.floor(this.random()*mudTrack.length);
      const owners=this.players.flatMap((p,seat)=>p.pos===field && seat!==this.turn ? [seat] : []);
      if (!owners.length) owners.push(this.turn);
      if (this.random()<.12) {
        const next=this.players.findIndex((p,seat)=>p.pos===(field+1)%mudTrack.length && seat!==this.turn);
        if (next>=0 && !owners.includes(next)) {
          if (owners[0]===this.turn) owners[0]=next;
          else owners.push(next);
        }
      }
      for (const owner of owners) this.gain(owner,1);
      drops.push({field,owners});
    }
    this.participant().pos=-1;
    this.phase='splash';
    return drops;
  }

  end(extra=false) {
    this.winners=this.players.flatMap((p,seat)=>p.mud>=this.goal?[seat]:[]);
    if (this.winners.length) { this.phase='finish'; return; }
    if (!extra) this.turn=(this.turn+1)%this.players.length;
    this.phase='choose';
  }
}
