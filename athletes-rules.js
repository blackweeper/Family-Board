const athleteRoster = [
  ['alchemist','Alchimiste','Sur un 1 ou un 2, peut choisir un déplacement de 4.'],
  ['witch','Baba Yaga','Fait trébucher les athlètes avec qui elle partage une case après un arrêt.'],
  ['banana','Banane','Fait trébucher les athlètes qui la dépassent.'],
  ['mouth','B.O.U.C.H.E.','Élimine l’unique athlète déjà installé sur sa case d’arrivée.'],
  ['captain','Cap’taine Passe','Un 1 conservé au dé lui donne le prochain tour.'],
  ['centaur','Centaure','Fait reculer de deux cases les athlètes qu’il dépasse.'],
  ['worm','Chenille','Vole le déplacement principal des autres sur un 1 et avance d’une case.'],
  ['wheel','Cinquième Roue','Peut rejoindre une case occupée par exactement deux athlètes.'],
  ['coach','Coach','Ajoute 1 au déplacement principal de chaque athlète qui partage sa case, lui compris.'],
  ['blimp','Dirigeable','+3 avant le deuxième virage au début de son tour, puis −1.'],
  ['rocket','Docteur Fusée','Peut doubler son dé, puis appliquer les bonus et malus. Il trébuche après le déplacement.'],
  ['duelist','Duelliste','Peut défier un voisin de case. Le meilleur dé avance de deux cases, égalité comprise pour le Duelliste.'],
  ['sleep','Endormimie','Gagne un bronze si elle commence seule en dernière position.'],
  ['genie','Génie','Peut deviner la face du dé pour gagner un tour immédiat.'],
  ['baby','Gros Bébé','Hors du Départ, repousse les autres athlètes sur la case précédente.'],
  ['bear','Gros Fêtard','Attire tout le monde d’une case au début de son tour. Chaque voisin de case lui donne +1.'],
  ['frog','Grouille-Grenouille','Ses déplacements sautent les cases occupées.'],
  ['legs','Guy Bolles','Peut avancer de cinq cases à la place du lancer.'],
  ['hyena','Hyènarquoise','Avance de deux cases si un athlète finit son tour à une case ou moins d’où il l’a commencé.'],
  ['hypnotist','Hypnotiseur','Peut téléporter un autre athlète sur sa case avant de jouer.'],
  ['copy','Imichateur','Copie le pouvoir imprimé d’un athlète en tête.'],
  ['twin','Jumeau','Peut reprendre le pouvoir d’un vainqueur précédent.'],
  ['servant','Larbin','Avance de deux cases avant qu’un autre athlète joue son 6 conservé.'],
  ['hare','Lièvrapide','Avance avec +2, sauf s’il commence seul en tête : il reste sur place.'],
  ['wizard','Magicien','Peut relancer jusqu’à deux fois et conserve le dernier dé.'],
  ['merchant','Marchand Déambulant','Offre une relance par tour. Quand un autre l’utilise, le Marchand avance d’une case.'],
  ['egg','Œuf','Avant la course, choisit un pouvoir parmi trois cartes piochées.'],
  ['fish','Poisson-Ventouse','Peut accompagner un athlète qui avance depuis sa case.'],
  ['cheer','Pompon','Peut faire avancer les derniers de deux cases, puis avance d’une case.'],
  ['romance','Romantique','Avance de deux cases quand un athlète en rejoint exactement un autre.'],
  ['fleas','Sac-à-Puces','Avance d’une case après le déclenchement d’un autre pouvoir.'],
  ['sisyphus','Sisyphe','Démarre avec quatre bronzes. Un 6 le ramène au Départ et lui coûte un point.'],
  ['slime','Slime','Retire 1 aux déplacements principaux des autres athlètes.'],
  ['referee','Tatillon','Les autres doivent avoir la distance exacte pour franchir l’arrivée.'],
  ['swap','Tong','Peut échanger sa case avec un autre athlète à la place du lancer.'],
  ['seer','Tremplin-Devin','Pronostique le vainqueur au premier tour. S’il tombe juste, prend aussitôt la deuxième place.'],
].map(([id,name,power],image)=>({id,name,power,image,index:image}));

const athleteById = Object.fromEntries(athleteRoster.map(card=>[card.id,card]));
const athleteAwards = [[3,2],[4,3],[4,3],[5,4]];
const athleteTiles = {1:'star',5:'trip',7:3,11:1,13:'star',16:-4,17:'trip',23:2,24:-2,26:'trip'};
const athleteFinish = 30;

class AthleteRace {
  constructor(entrants,{wild=false, first=0, roll=()=>1+Math.floor(Math.random()*6), previous=[], reserve=[], bronze=43, points=[]}={}) {
    this.racers=entrants.map(({id,player},seat)=>({id,player,seat,pos:0,out:false,tripped:false,turns:0,copy:id,model:null,bet:null}));
    this.wild=wild;
    this.first=first;
    this.roll=roll;
    this.previous=previous;
    this.reserve=reserve;
    this.bronze=bronze;
    this.points=points;
    this.earned=Array.from({length:Math.max(...entrants.map(x=>x.player))+1},()=>0);
    this.order=[];
    this.eliminated=[];
    this.active=null;
    this.priority=[];
    this.branches=new Set();
  }

  live() { return this.racers.filter(r=>!r.out&&r.pos<athleteFinish); }
  alive(r) { return !r.out&&r.pos<athleteFinish; }
  done() { return this.order.length>=2; }
  rank(group,first) {
    return [...group].sort((a,b)=> ((a.seat-first+this.racers.length)%this.racers.length)-((b.seat-first+this.racers.length)%this.racers.length));
  }
  extremes(lead) {
    const live=this.live();
    const pos=(lead?Math.max:Math.min)(...live.map(r=>r.pos));
    return live.filter(r=>r.pos===pos);
  }
  has(r,power) {
    if (!this.alive(r)) return false;
    return this.powerId(r)===power;
  }
  powerId(r) {
    return r.copy==='copy'?r.model?.id:r.copy;
  }
  holders(power) {
    return this.rank(this.live().filter(r=>this.has(r,power)),this.active?.seat??0);
  }
  label(r) { return athleteById[r.id].name; }
  options(racers) { return racers.map(r=>[r,this.label(r)]); }

  *ask(r,title,options,optional=true) {
    if (!options.length) return null;
    return yield {type:'ask',player:r.player,title,choices:optional?options.concat([[null,'Passer']]):options};
  }

  *refresh() {
    const leaders=this.extremes(true);
    for(const copy of this.live().filter(r=>r.copy==='copy')) {
      const choices=leaders.filter(r=>r!==copy);
      if(choices.includes(copy.model)) continue;
      const next=choices.length<=1?choices[0]:yield* this.ask(copy,'Quel athlète veux-tu imiter ?',this.options(choices),false);
      if(copy.model?.id==='seer'&&next?.id!=='seer') copy.bet=null;
      copy.model=next;
    }
  }

  *prepare() {
    for(const r of this.rank(this.racers,this.racers.find(r=>r.player===this.first).seat)) {
      const seen=new Set();
      while (!seen.has(r.copy)) {
        seen.add(r.copy);
        if (r.copy==='egg') {
          const candidates=this.reserve.splice(0,3);
          const id=yield* this.ask(r,'Œuf choisit un pouvoir',candidates.map(id=>[id,athleteById[id].name]),false);
          if (!id) break;
          r.copy=id;
        } else if(r.copy==='twin') {
          const id=yield* this.ask(r,'Jumeau peut imiter un ancien vainqueur',[...new Set(this.previous)].map(id=>[id,athleteById[id].name]));
          if (!id) break;
          r.copy=id;
        } else {
          if(r.copy==='sisyphus') this.award(r,4);
          break;
        }
      }
    }
    yield* this.refresh();
  }

  award(r,n) {
    if(n>0) n=Math.min(n,this.bronze);
    else n=Math.max(n,-(this.earned[r.player]+(this.points[r.player]??0)));
    this.earned[r.player]+=n;
    this.bronze-=n;
  }

  stateKey() {
    return JSON.stringify([this.racers.map(r=>[r.pos,r.out,r.tripped,r.model?.seat,r.bet?.seat]),this.earned,this.bronze,this.order.map(r=>r.seat)]);
  }

  *power(r,key,action) {
    if(this.done()||!this.alive(r)) return;
    const signature=key+':'+r.seat+':'+this.stateKey();
    if(this.branches.has(signature)) return;
    this.branches.add(signature);
    try {
      yield {type:'power',r,text:this.label(r)+' active son pouvoir'};
      if(action) yield* action();
      if(this.done()) return;
      for(const flea of this.holders('fleas')) {
        if(flea!==r) yield* this.power(flea,'fleas',()=>this.move([[flea,1]]));
      }
    } finally { this.branches.delete(signature); }
  }

  trip(r) {
    if(this.alive(r)) r.tripped=true;
  }

  *die(r,kind='Dé') {
    const value=this.roll();
    yield {type:'die',r,value,text:kind+' · '+this.label(r)};
    return value;
  }

  *finish(r,byElimination=false) {
    if (this.done()) return;
    r.pos=athleteFinish;
    this.order.push(r);
    yield {type:'finish',r,text:this.label(r)+(byElimination?' décroche la place restante !':' franchit l’arrivée !')};
    if(this.order.length!==1) return;
    const prophets=this.racers.filter(p=>!p.out&&this.powerId(p)==='seer'&&p.bet===r);
    prophets.sort((a,b)=>Number(b.id==='seer')-Number(a.id==='seer'));
    if(prophets.length) this.order.push(prophets[0]);
  }

  *move(motions,{warp=false}={}) {
    if(this.done()) return;
    const before=new Map(this.live().map(r=>[r,r.pos]));
    const targets=[];
    const group=new Set(motions.map(([r])=>r));
    const occupied=new Set([...before].filter(([r])=>!group.has(r)).map(([,pos])=>pos));
    const amounts=new Map(motions);
    for(const r of this.rank([...amounts.keys()],this.active?.seat??0)) {
      const amount=amounts.get(r);
      if(!this.alive(r)||(!warp&&!amount)) continue;
      const from=r.pos;
      let to=warp?amount:from, skipped=0;
      if(!warp) {
        const dir=Math.sign(amount);
        for(let i=0;i<Math.abs(amount);i++){
          if(to===0&&dir<0) break;
          to+=dir;
          while(this.has(r,'frog')&&to>0&&to<athleteFinish&&occupied.has(to)){
            skipped++;
            to+=dir;
          }
        }
        if(to>athleteFinish&&this.holders('referee').some(p=>p!==r)) continue;
      }
      to=Math.min(athleteFinish,Math.max(0,to));
      if(to!==from) targets.push({r,from,to,skipped});
    }
    if(!targets.length) return;
    const following=new Map();
    if(!warp) {
      for(const fish of this.holders('fish')){
        if(group.has(fish)) continue;
        const rides=targets.filter(m=>m.from===fish.pos&&m.to>m.from);
        const ride=yield* this.ask(fish,'Suivre un athlète ?',rides.map(m=>[m,this.label(m.r)]));
        if(ride) {
          following.set(fish,ride.r);
          targets.splice(targets.indexOf(ride)+1,0,{r:fish,from:fish.pos,to:ride.to,skipped:0});
        }
      }
    }
    const moving=new Set(targets.map(m=>m.r));
    const powersBefore=new Map(this.racers.map(r=>[r,this.powerId(r)]));
    for(const m of targets) m.r.pos=m.to;
    yield {type:'move',moves:targets,warp,text:targets.map(m=>this.label(m.r)).join(' · ')};
    for(const m of targets) {
      if(m.to===athleteFinish) yield* this.finish(m.r);
      if(this.done()) return;
    }
    yield* this.refresh();
    const reactions=[];
    const queue=(owner,key,action,ready=()=>true)=>reactions.push({owner,key,action,ready});
    const crossed=m=>[...before].filter(([r,at])=>r!==m.r&&
      ((m.from<at&&m.to>at)||(m.from>at&&m.to<at)))
      .sort(([,a],[,b])=>Math.sign(m.to-m.from)*(a-b));
    for(const m of targets){
      if(!warp) {
        const passed=crossed(m);
        for(const [r] of passed) if(powersBefore.get(r)==='banana')
          queue(r,'banana-'+m.r.seat,function*(){this.trip(m.r);}.bind(this));
        if(powersBefore.get(m.r)==='centaur') {
          const groups=new Map();
          for(const [r,pos] of passed) groups.set(pos,[...(groups.get(pos)??[]),[r,-2]]);
          if(groups.size) queue(m.r,'centaur',function*(){
            for(const group of groups.values()) yield* this.move(group);
          }.bind(this));
        }
        for(let i=0;i<m.skipped;i++) queue(m.r,'frog-'+i,null);
      }
      const hosts=this.live().filter(r=>!moving.has(r)&&r.pos===m.to);
      const sharing=r=>this.alive(m.r)&&this.alive(r)&&m.r.pos===r.pos;
      const paired=r=>sharing(r)&&this.live().filter(p=>p!==m.r&&!moving.has(p)&&p.pos===m.r.pos).length===1;
      if(hosts.length===1) {
        const host=hosts[0];
        for(const romance of this.holders('romance')) queue(romance,'romance-'+m.r.seat,()=>this.move([[romance,2]]),()=>paired(host));
        if(this.has(m.r,'mouth')) queue(m.r,'mouth',function*(){
          if(!this.alive(host)||host.pos!==m.r.pos) return;
          host.out=true;
          this.eliminated.push(host);
          yield {type:'exit',r:host,text:this.label(host)+' quitte la course'};
          if(this.live().length===1&&!this.done()) yield* this.finish(this.live()[0],true);
          yield* this.refresh();
        }.bind(this),()=>paired(host));
      }
      for(const r of hosts) {
        const mover=m.r;
        if(this.has(r,'witch')) queue(r,'witch-'+mover.seat,function*(){this.trip(mover);}.bind(this),()=>sharing(r));
        if(this.has(mover,'witch')) queue(mover,'witch-'+r.seat,function*(){this.trip(r);}.bind(this),()=>sharing(r));
        if(this.has(r,'duelist')) queue(r,'duel-'+mover.seat,()=>this.duel(r,mover),()=>sharing(r));
        if(this.has(mover,'duelist')) queue(mover,'duel-'+r.seat,()=>this.duel(mover,r),()=>sharing(r));
      }
      if(m.to>0) {
        for(const r of this.live().filter(r=>r!==m.r&&r.pos===m.to)) {
          if(this.has(m.r,'baby')) queue(m.r,'baby-'+r.seat,()=>this.bump(m.r,r),()=>sharing(r)&&(!this.has(r,'baby')||m.r.id==='baby'));
          if(!moving.has(r)&&this.has(r,'baby')) queue(r,'baby-'+m.r.seat,()=>this.bump(r,m.r),()=>sharing(r)&&(!this.has(m.r,'baby')||r.id==='baby'));
        }
      }
    }
    for(const fish of following.keys()) queue(fish,'fish',null);
    const start=this.active?.seat??0;
    const priority=r=>{
      const source=following.get(r)??r;
      return 2*((source.seat-start+this.racers.length)%this.racers.length)+Number(source!==r);
    };
    reactions.sort((a,b)=>priority(a.owner)-priority(b.owner));
    if(this.wild) yield* this.resolveTiles(targets);
    for(const {owner,key,action,ready} of reactions) {
      if(!this.alive(owner)||!ready()) continue;
      if(key.startsWith('duel-')&&!(yield* this.ask(owner,'Provoquer un duel ?',[[true,'Duel']]))) continue;
      yield* this.power(owner,key,action);
      if(this.done()) return;
    }
  }

  *resolveTiles(targets) {
    // The followed athlete is already ordered immediately before its passenger.
    for(const {r,to} of targets){
      if(!this.alive(r)||this.done()||to!==r.pos) continue;
      const tile=athleteTiles[r.pos];
      const key='tile:'+r.seat+':'+this.stateKey();
      if(!tile||this.branches.has(key)) continue;
      this.branches.add(key);
      try {
        yield {type:'tile',r,text:tile==='star'?'+1 bronze':tile==='trip'?'Trébuchement':(tile>0?'+':'')+tile+' cases'};
        if(tile==='star') this.award(r,1);
        else if(tile==='trip') this.trip(r);
        else yield* this.move([[r,tile]]);
      } finally { this.branches.delete(key); }
    }
  }

  *bump(baby,other) {
    if(!this.alive(other)||other.pos!==baby.pos||!other.pos) return;
    const active=other===this.active;
    yield* this.move([[other,active?-1:baby.pos-1]],{warp:!active});
    if(this.has(other,'banana')) this.trip(baby);
  }

  *duel(r,other) {
    if(!this.alive(r)||!this.alive(other)||other.pos!==r.pos) return;
    const own=yield* this.die(r,'Duel'), rival=yield* this.die(other,'Duel');
    yield* this.move([[own>=rival?r:other,2]]);
  }

  *offerDuel(r,other) {
    if(!this.alive(r)||!this.alive(other)||other.pos!==r.pos) return;
    if(yield* this.ask(r,'Défier '+this.label(other)+' ?',[[true,'Duel']]))
      yield* this.power(r,'duel-'+other.seat,()=>this.duel(r,other));
  }

  *takeTurn(r) {
    if (!this.alive(r)||this.done()) return;
    this.active=r;
    const start=r.pos;
    const lead=this.extremes(true);
    const skip=this.has(r,'hare')&&lead.length===1&&lead[0]===r;
    if(this.has(r,'seer')&&!r.turns) r.bet=yield* this.ask(r,'Qui va gagner cette course ?',this.options(this.live()),false);
    r.turns++;
    if(this.has(r,'sleep')&&this.extremes(false).length===1&&this.extremes(false)[0]===r)
      yield* this.power(r,'sleep',function*(){this.award(r,1);}.bind(this));
    if(this.has(r,'hypnotist')) {
      const target=yield* this.ask(r,'Téléporter un athlète ici ?',this.options(this.live().filter(p=>p!==r&&p.pos!==r.pos)));
      if(target) yield* this.power(r,'hypnotist',()=>this.move([[target,r.pos]],{warp:true}));
    }
    if(this.has(r,'wheel')) {
      const positions=[...new Set(this.live().map(p=>p.pos))].filter(pos=>pos!==r.pos&&this.live().filter(p=>p.pos===pos).length===2);
      const to=yield* this.ask(r,'Rejoindre deux athlètes ?',positions.map(pos=>[pos,pos===0?'Départ':'Case '+pos]));
      if(to!==null) yield* this.power(r,'wheel',()=>this.move([[r,to]],{warp:true}));
    }
    if(this.has(r,'bear')) {
      const motions=this.live().filter(p=>p!==r&&p.pos!==r.pos).map(p=>[p,Math.sign(r.pos-p.pos)]);
      if(motions.length) yield* this.power(r,'bear',()=>this.move(motions));
    }
    if(this.has(r,'cheer')&&(yield* this.ask(r,'Aider les derniers ?',[[true,'Encourager']]))) {
      yield* this.power(r,'cheer',function*(){
        yield* this.move(this.extremes(false).map(p=>[p,2]));
        yield* this.move([[r,1]]);
      }.bind(this));
    }
    if(!this.done()&&this.alive(r)) {
      if(!skip&&r.tripped) {
        r.tripped=false;
        yield {type:'power',r,text:this.label(r)+' se relève'};
      } else if(!skip) yield* this.mainMove(r,start);
    }
    if(!this.done()&&Math.abs(start-r.pos)<=1) {
      for(const hyena of this.holders('hyena')) yield* this.power(hyena,'hyena',()=>this.move([[hyena,2]]));
    }
  }

  *mainMove(r,start) {
    const options=[[true,'Lancer le dé']];
    if(this.has(r,'legs')) options.push(['legs','Avancer de 5']);
    if(this.has(r,'swap')) options.push(...this.live().filter(p=>p!==r&&p.pos!==r.pos).map(p=>[p,'Échanger avec '+this.label(p)]));
    const action=yield* this.ask(r,'À '+this.label(r)+' de jouer',options,false);
    if(action!==true&&action!=='legs') {
      const to=action.pos;
      yield* this.power(r,'swap',()=>this.move([[r,to],[action,r.pos]],{warp:true}));
      return;
    }
    let number=5;
    let extra=false;
    const captains=[];
    if(action==='legs') yield* this.power(r,'legs');
    else {
      const guess=this.has(r,'genie')?yield* this.ask(r,'Prédire le dé ?',Array.from({length:6},(_,i)=>[i+1,String(i+1)])):null;
      number=yield* this.die(r);
      number=yield* this.reroll(r,number);
      if(this.done()||!this.alive(r)) return;
      extra=guess===number;
      if(number===1) captains.push(...this.holders('captain'));
      if(number===6) for(const servant of this.holders('servant').filter(p=>p!==r)) yield* this.power(servant,'servant',()=>this.move([[servant,2]]));
      if(this.done()||!this.alive(r)) return;
      // Le livret français donne le tour supplémentaire de Génie avant celui de Cap’taine Passe.
      if(extra) {
        this.priority.unshift({r,skip:false});
        yield* this.power(r,'genie');
      }
      if(number===1) {
        const worms=this.holders('worm').filter(p=>p!==r);
        for(const owner of this.rank([...captains,...worms],r.seat)){
          if(worms.includes(owner)) yield* this.power(owner,'worm',()=>this.move([[owner,1]]));
          else yield* this.power(owner,'captain',function*(){
            this.priority.push({r:owner,skip:true});
          }.bind(this));
        }
        if(worms.length) return;
      }
      if(number===6&&this.has(r,'sisyphus')) {
        yield* this.power(r,'sisyphus',function*(){
          this.award(r,-1);
          yield* this.move([[r,0]],{warp:true});
        }.bind(this));
        return;
      }
    }
    let distance=number;
    let trip=false;
    if(action===true&&number<=2&&this.has(r,'alchemist')&&
      (yield* this.ask(r,'Remplacer le déplacement par 4 ?',[[true,'Avancer de 4']]))){
      distance=4;
      yield* this.power(r,'alchemist');
    }
    if(action===true&&this.has(r,'rocket')&&(yield* this.ask(r,'Doubler le déplacement et trébucher ?',[[true,'Doubler']]))) {
      distance*=2;
      trip=true;
      yield* this.power(r,'rocket');
    }
    const mods=[];
    if(this.has(r,'hare')) mods.push([r,2,'hare']);
    if(this.has(r,'blimp')) mods.push([r,start<15?3:-1,'blimp']);
    if(this.has(r,'bear')) {
      const bonus=this.live().filter(p=>p!==r&&p.pos===r.pos).length;
      if(bonus) mods.push([r,bonus,'bear-bonus']);
    }
    for(const coach of this.holders('coach').filter(p=>p.pos===r.pos)) mods.push([coach,1,'coach']);
    for(const slime of this.holders('slime').filter(p=>p!==r)) mods.push([slime,-1,'slime']);
    for(const [owner,value,key] of mods) {
      distance+=value;
      yield* this.power(owner,key);
    }
    yield* this.move([[r,distance]]);
    if(trip) this.trip(r);
  }

  *reroll(r,number) {
    const used=new Set();
    let wizardRolls=0;
    while(this.alive(r)&&!this.done()) {
      const wizard=this.has(r,'wizard')&&wizardRolls<2;
      const merchants=this.holders('merchant').filter(merchant=>!used.has(merchant));
      const options=merchants.map(merchant=>[merchant,'Relancer avec '+this.label(merchant)]);
      if(wizard) options.unshift(['wizard','Relancer avec Magicien']);
      const source=yield* this.ask(r,'Dé : '+number,options);
      if(!source) break;
      if(source==='wizard') {
        wizardRolls++;
        number=yield* this.die(r,'Relance');
        yield* this.power(r,'wizard');
      } else {
        used.add(source);
        if(source!==r) yield* this.power(source,'merchant',()=>this.move([[source,1]]));
        if(this.alive(r)&&!this.done()) {
          number=yield* this.die(r,'Relance');
          if(source===r) yield* this.power(source,'merchant');
        }
      }
    }
    return number;
  }

  *run() {
    yield* this.prepare();
    const playerCount=this.earned.length;
    let player=this.first;
    let alreadyPlayed=new Set();
    this.active=this.racers.find(r=>r.player===player);
    for(const duelist of this.holders('duelist')) {
      for(const rival of this.rank(this.live().filter(r=>r!==duelist),this.active.seat)) yield* this.offerDuel(duelist,rival);
    }
    while(!this.done()&&this.live().length>1) {
      const choices=this.live().filter(r=>r.player===player&&!alreadyPlayed.has(r));
      if(!choices.length) {
        player=(player+1)%playerCount;
        alreadyPlayed.clear();
        continue;
      }
      const r=choices.length===1?choices[0]:yield* this.ask(choices[0],'Qui court en premier ?',this.options(choices),false);
      alreadyPlayed.add(r);
      yield* this.takeTurn(r);
      while(this.priority.length&&!this.done()) {
        const entry=this.priority.shift();
        if(!this.alive(entry.r)) continue;
        if(entry.skip) {
          player=entry.r.player;
          alreadyPlayed=new Set([entry.r]);
        }
        yield* this.takeTurn(entry.r);
      }
    }
    if(!this.done()&&this.live().length===1) yield* this.finish(this.live()[0],true);
  }
}
