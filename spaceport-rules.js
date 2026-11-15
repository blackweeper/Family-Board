const spaceAnimals=['Panda','Poussin','Renard','Grenouille'];
const spaceColors=['Turquoise','Corail','Or','Vert','Violet'];
const spaceEmblems=['≋','✿','☀','❧','✧'];
const spacePowers=['radar','reserve','spy'];

function spaceCards(random){
  const cards=Array.from({length:40},(_,id)=>{
    const color=Math.floor(id/8),part=id%4,copy=Math.floor(id/4)%2;
    const animal=(part+color+copy)%4;
    return {id,color,part,animal,
      animals:partyShuffle([animal,(animal+1+(color+copy)%3)%4],random),
      colors:partyShuffle([color,(color+1+(part+copy)%4)%5],random)};
  });
  return partyShuffle(cards,random);
}

class SpaceExpedition {
  constructor(count,first,mode,random=Math.random){
    this.mode=mode;
    this.turn=first;
    this.phase=mode==='ships'?'brief':'draw';
    this.winners=[];
    this.pending=null;
    this.bonus=false;
    this.report=null;
    const deck=spaceCards(random);
    this.reserve=mode==='ships'?deck.splice(0,5):[];
    this.piles=[[],[],[]];
    deck.forEach((card,i)=>this.piles[i%3].push(card));
    this.ships=[];
    const spies=partyShuffle([0,1,2,3,4],random);
    const contracts=partyShuffle(Array.from({length:12},(_,i)=>[0,1,2,3].filter(animal=>animal!==i%4)),random);
    const limit=count===5?2:3;
    this.players=Array.from({length:count},(_,i)=>{
      const goals=mode==='animals'?contracts.splice(0,limit-Number(i===first)):[];
      if(mode==='animals'&&i===first)goals.unshift([0,1,2,3]);
      return {spy:spies[i],powers:{radar:true,reserve:true,spy:true},score:0,goals:goals.map(animals=>({animals,filled:animals.map(()=>false)}))};
    });
    this.briefed=0;
  }

  confirmBrief(){
    if(this.phase!=='brief')return false;
    this.briefed++;
    this.turn=(this.turn+1)%this.players.length;
    if(this.briefed===this.players.length)this.phase='draw';
    return true;
  }

  reveal(pile){
    if(!['draw','extra'].includes(this.phase)||!this.piles[pile]?.length)return null;
    this.pending=this.piles[pile].pop();
    this.report=null;
    this.phase='reveal';
    return this.pending;
  }

  get visible(){return this.piles.map(pile=>pile.at(-1));}

  seats(){
    const animal=this.pending?.animal;
    if(this.mode!=='animals'||animal===undefined)return [];
    const possible=(player)=>this.players[player].goals.flatMap((goal,index)=>
      goal.animals.some((id,slot)=>id===animal&&!goal.filled[slot])?[{player,index}]:[]);
    const own=possible(this.turn);
    return own.length?own:this.players.flatMap((_,i)=>i===this.turn?[]:possible(i));
  }

  resolveAnimal(player,index){
    if(this.phase!=='reveal'||this.mode!=='animals')return false;
    const animal=this.pending.animal, choices=this.seats();
    if(!choices.length){this.report={type:'discard',animal};this.next();return true;}
    if(!choices.some(seat=>seat.player===player&&seat.index===index))return false;
    const person=this.players[player],goal=person.goals[index];
    const slot=goal.animals.findIndex((id,i)=>id===animal&&!goal.filled[i]);
    goal.filled[slot]=true;
    const finished=goal.filled.every(Boolean);
    if(finished)person.score++;
    this.report={type:finished?'launch':'board',animal,player,index};
    if(person.score===person.goals.length)this.finish([player]);
    else this.next();
    return true;
  }

  shipOptions(){
    if(this.mode!=='ships'||!this.pending)return [];
    const {color,part}=this.pending;
    return this.ships.flatMap((ship,i)=>ship.color===color&&ship.pieces.length<4&&!ship.pieces.includes(part)?[i]:[]);
  }

  build(index){
    if(this.phase!=='reveal'||this.mode!=='ships')return false;
    const options=this.shipOptions();
    if(options.length&&!options.includes(index)||!options.length&&index!==-1)return false;
    const {color,part}=this.pending;
    if(index===-1){index=this.ships.length;this.ships.push({color,pieces:[],owner:null,spies:[]});}
    const ship=this.ships[index];
    ship.pieces.push(part);
    const full=ship.pieces.length===4;
    if(full){ship.owner=this.turn;this.players[this.turn].score++;}
    this.report={type:full?'complete':'piece',color,index,part,player:this.turn};
    if(this.players[this.turn].score===3)this.finish([this.turn]);
    else if(this.bonus&&this.piles.some(pile=>pile.length)){this.bonus=false;this.pending=null;this.phase='extra';}
    else this.next();
    return true;
  }

  spyTarget(player){
    return this.ships.findIndex(ship=>ship.color===this.players[player].spy&&ship.pieces.length===4);
  }

  canPower(power,player=this.turn){
    if(this.mode!=='ships'||!this.players[player].powers[power])return false;
    if(power==='radar')return this.piles.some(pile=>pile.length);
    if(power==='reserve')return Boolean(this.reserve.length);
    return power==='spy'&&this.spyTarget(player)>=0;
  }

  power(power){
    if(this.phase!=='draw'||!this.canPower(power))return false;
    if(power==='spy'){
      const index=this.spyTarget(this.turn);
      const player=this.players[this.turn];
      player.powers.spy=false;
      this.ships[index].spies.push(this.turn);
      player.score++;
      this.report={type:'spy',color:player.spy,index,player:this.turn};
      if(player.score===3)this.finish([this.turn]);
      else this.next();
    }else this.phase=power;
    return true;
  }

  cancelPower(){
    if(!['radar','reserve'].includes(this.phase))return false;
    this.phase='draw';
    return true;
  }

  guess(pile,color){
    if(this.phase!=='radar'||!this.visible[pile]?.colors.includes(color))return false;
    this.players[this.turn].powers.radar=false;
    this.pending=this.piles[pile].pop();
    this.bonus=this.pending.color===color;
    this.report={type:this.bonus?'radar-hit':'radar-miss'};
    this.phase='reveal';
    return true;
  }

  pickReserve(index){
    if(this.phase!=='reserve'||!this.reserve[index])return false;
    this.players[this.turn].powers.reserve=false;
    this.pending=this.reserve.splice(index,1)[0];
    this.report=null;
    this.phase='reveal';
    return true;
  }

  next(){
    this.pending=null;
    this.bonus=false;
    this.phase='draw';
    for(let step=0;step<this.players.length;step++){
      this.turn=(this.turn+1)%this.players.length;
      if(this.piles.some(pile=>pile.length)||spacePowers.some(power=>this.canPower(power)))return;
    }
    const points=this.players.map(player=>this.mode==='animals'?player.score*16+player.goals.reduce((sum,goal)=>sum+goal.filled.filter(Boolean).length,0):player.score);
    this.finish(points.flatMap((point,i)=>point===Math.max(...points)?[i]:[]));
  }

  finish(winners){
    this.winners=winners;
    this.pending=null;
    this.phase='finish';
  }
}
