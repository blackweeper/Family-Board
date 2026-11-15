const krakenNames=['Astrid','Samuel','Elena','Billy'];
const krakenActions={move:['↔','Déplacer'],cannon:['✹','Canon'],pistol:['✦','Pistolet'],saber:['⚔','Sabre'],repair:['⚒','Réparer'],wild:['⚑','Joker']};
const krakenMarks=['★','♣','◆','✿'];
const krakenDepth=['bulles','canon','pistolet','sabre'];
const krakenDepthActions=[null,'cannon','pistol','saber'];
const krakenDeck=[
  ['move,cannon,pistol!', 'move,saber!', 'move,repair,saber', 'pistol,cannon!', 'move,move,saber!', 'repair,cannon', 'move,wild!', 'pistol,repair!', 'move,cannon,saber', 'move,pistol!'],
  ['move,cannon!', 'repair,move!', 'saber,pistol', 'move,pistol,saber!', 'move,cannon,repair', 'cannon,wild!', 'move,move,pistol!', 'cannon,saber', 'move,saber,repair!', 'pistol,repair!'],
  ['move,pistol,cannon!', 'move,saber!', 'pistol,repair', 'pistol,pistol!', 'move,wild!', 'move,repair,saber', 'move,cannon,pistol!', 'saber,pistol', 'repair,pistol!', 'cannon,move!'],
  ['move,cannon,cannon!', 'move,saber!', 'cannon,saber,repair', 'move,pistol,cannon!', 'repair,cannon!', 'move,move,saber', 'wild,cannon!', 'pistol,saber', 'move,repair,pistol!', 'cannon,move!'],
];
const krakenZone=lane=>Math.floor(lane/4)*2+Math.floor((lane%4)/2);
const krakenDiceSteps=[2,4,6,7];

class KrakenCrew {
  constructor(pirates,count,level,random=Math.random){
    this.pirates=pirates;
    this.solo=count===1;
    this.level=level;
    this.random=random;
    this.turn=0;
    this.positions=pirates.map((_,i)=>i);
    this.lanes=Array(8).fill(0);
    this.rails=Array(8).fill(true);
    this.holes=[];
    this.rage=0;
    this.boss=-1;
    this.hits=0;
    this.phase='deploy';
    this.won=null;
    this.whirls=new Map();
    this.events=[];
    const decks=pirates.map(pirate=>krakenDeck[pirate].map(text=>({pirate,taunt:text.endsWith('!'),actions:text.replace('!','').split(',')})));
    if(this.solo)this.decks=[partyShuffle(decks.flat(),random)];
    else this.decks=decks.map(deck=>partyShuffle(deck,random));
    this.cards=this.decks.map(deck=>deck.splice(0,2));
  }

  get hand(){return this.cards[this.turn];}

  get actor(){
    if(!this.solo)return this.turn;
    return this.pirates.indexOf(this.selected?.pirate??this.decks[0][0].pirate);
  }

  get power(){return this.level==='easy'?-1:(this.solo?this.soloPower:this.pirates[this.actor]);}

  get diceCount(){return 2+krakenDiceSteps.filter(step=>step<=this.rage).length;}

  deploy(player,zone){
    if(this.phase!=='deploy'||!(player in this.positions)||![0,1,2,3].includes(zone))return false;
    this.positions[player]=zone;
    return true;
  }

  whirl(lane,depth){
    if(this.phase!=='deploy'||this.level!=='hard'||!Number.isInteger(lane)||lane<0||lane>7||![1,2,3].includes(depth))return false;
    const key=lane*4+depth;
    if(this.whirls.has(key))this.whirls.delete(key);
    else if(this.whirls.size<4)this.whirls.set(key,true);
    else return false;
    return true;
  }

  start(){
    if(this.phase!=='deploy')return false;
    if(this.level==='hard'&&!this.whirls.size)this.whirls.set(2*4+2,true);
    this.phase='roll';
    return true;
  }

  roll(){
    if(this.phase!=='roll')return null;
    this.soloPower=this.solo?this.decks[0][0].pirate:null;
    this.events=[];
    const dice=Array.from({length:this.diceCount},(_,i)=>({side:i%2,face:Math.floor(this.random()*6)}));
    for(const side of [0,1]){
      let faces=dice.filter(die=>die.side===side).map(die=>die.face);
      faces.sort((a,b)=>Number(b===4)-Number(a===4));
      for(const face of faces){
        if(this.won!==null)break;
        if(face===5||face===4&&this.power===1)continue;
        if(face===4){
          for(let lane=side*4;lane<side*4+4&&this.won===null;lane++)this.advance(lane);
        }else this.advance(side*4+face);
      }
    }
    if(this.won===null)this.phase='card';
    return dice;
  }

  advance(lane){
    const before=this.lanes[lane];
    let depth=before+1;
    while(this.whirls.has(lane*4+depth)&&depth<=3)depth++;
    if(depth>3){
      const event=this.rails[lane]?'break':'hole';
      if(this.rails[lane])this.rails[lane]=false;
      else this.holes.push(lane);
      this.lanes[lane]=0;
      this.events.push({type:event,lane,from:before,to:0});
      if(this.holes.length===4)this.finish(false);
    }else{
      this.lanes[lane]=depth;
      this.events.push({type:'rise',lane,from:before,to:depth});
    }
  }

  choose(index){
    if(this.phase!=='card'||!this.hand[index])return false;
    this.selected=this.hand[index];
    this.selectedIndex=index;
    this.actions=[...this.selected.actions];
    this.repeated=false;this.done=[];
    this.phase='act';
    return true;
  }

  choices(action){
    const position=this.positions[this.actor];
    if(action==='move')return [0,1,2,3].filter(zone=>zone!==position&&(zone^position)!==3);
    if(action==='repair')return this.rails.flatMap((rail,lane)=>!rail&&krakenZone(lane)===position?[lane]:[]);
    return this.lanes.flatMap((depth,lane)=>krakenDepthActions[depth]===action&&(krakenZone(lane)===position||(this.power===2&&action==='pistol'))?[lane]:[]);
  }

  slotActions(slot){
    return this.actions[slot]==='wild'?Object.keys(krakenActions).filter(action=>action!=='wild'):[this.actions[slot]];
  }

  act(slot,action,target){
    if(this.phase!=='act'||!this.slotActions(slot).includes(action)||!this.choices(action).includes(target))return false;
    this.events=[];
    this.actions[slot]=null;
    this.done.push(action);
    this.apply(action,target);
    return true;
  }

  repeat(action,target){
    if(this.phase!=='act'||this.power!==0||this.repeated||!this.done.includes(action)||!this.choices(action).includes(target))return false;
    this.repeated=true;
    this.events=[];
    this.apply(action,target);
    return true;
  }

  apply(action,target){
    if(action==='move'){
      this.events.push({type:'move',from:this.positions[this.actor],to:target,pirate:this.actor});
      this.positions[this.actor]=target;
    }else if(action==='repair'){
      this.rails[target]=true;
      this.events.push({type:'repair',lane:target});
    }else{
      this.repel(target);
      if(this.won===null&&action==='cannon'&&this.power===3){
        const side=Math.floor(target/4);
        for(let lane=side*4;lane<side*4+4;lane++){
          if(lane!==target&&lane!==this.boss&&this.lanes[lane]===1)this.repel(lane);
        }
      }
    }
  }

  repel(lane){
    this.events.push({type:lane===this.boss?'boss-hit':'hit',lane,from:this.lanes[lane],to:0});
    this.lanes[lane]=0;
    if(lane===this.boss){
      this.hits++;
      if(this.hits===(this.level==='easy'?1:3))this.finish(true);
    }
  }

  complete(){
    if(this.phase!=='act')return false;
    this.events=[];
    if(this.selected.taunt){
      if(this.boss>=0)this.advance(this.boss);
      else if(this.rage===7){
        this.phase='summon';
        return true;
      }else this.rage++;
    }
    if(this.won===null)this.next();
    return true;
  }

  summon(lane){
    if(this.phase!=='summon'||!Number.isInteger(lane)||lane<0||lane>7)return false;
    this.boss=lane;
    this.events=[{type:'summon',lane}];
    this.next();
    return true;
  }

  next(){
    const deck=this.decks[this.turn];
    deck.push(this.selected);
    this.hand[this.selectedIndex]=deck.shift();
    this.selected=null;
    if(!this.solo)this.turn=(this.turn+1)%this.pirates.length;
    this.phase='roll';
  }

  finish(won){this.won=won;this.phase='finish';}
}
