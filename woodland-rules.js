const mailMoods = ['Joyeux','Inquiet','Fâché','Fatigué','Surpris','Triste','Curieux','Paisible'];
const mailAttitudes = Array.from({length:4},(_,sheet) => Array.from({length:8},(_,slot) => ({ id:sheet*8+slot, mood:sheet === 0 ? slot : sheet === 2 ? 4 + Math.floor(slot/2) : Math.floor(slot/2) }))).flat();

class RabbitPost {
  constructor(count, first=0, hard=false, random=Math.random) {
    this.random=random;
    this.count=count;
    this.chief=first;
    this.day=hard?2:0;
    this.home=0;
    this.deck=partyShuffle(Array.from({length:84},(_,id)=>id),random);
    this.hands=Array.from({length:count},()=>this.deck.splice(-3));
    const doors=[0,1].map(color=>partyShuffle(mailAttitudes.filter(door=>door.id%2===color),random));
    this.homes=Array.from({length:4},(_,i)=>({ doors:[doors[0][i],doors[1][i]], delivered:false }));
    this.startDay();
  }

  startDay() {
    this.guest=null;
    this.seat=this.chief;
    this.entries=[];
    this.votes=new Map();
    this.phase='guest';
  }

  invite(index) {
    if(this.phase!=='guest'||![0,1].includes(index))return;
    this.guest=index;
    this.phase='submit';
  }

  submit(index) {
    const hand=this.hands[this.seat];
    if(this.phase!=='submit'||!Number.isInteger(index)||index<0||index>=hand.length)return;
    this.entries.push({ seat:this.seat, card:hand.splice(index,1)[0] });
    this.seat=(this.seat+1)%this.count;
    if(this.entries.length===this.count){
      this.entries=partyShuffle(this.entries,this.random);
      this.seat=(this.chief+1)%this.count;
      this.phase='vote';
    }
  }

  vote(index) {
    if(this.phase!=='vote'||!this.entries[index])return;
    this.votes.set(this.seat,index);
    this.seat=(this.seat+1)%this.count;
    if(this.seat===this.chief){
      this.correct=this.entries.findIndex(entry=>entry.seat===this.chief);
      this.hits=[...this.votes.values()].filter(vote=>vote===this.correct).length;
      if(this.hits>=2)this.homes[this.home].delivered=true;
      this.phase='result';
    }
  }

  get invited() { return this.homes.filter(home=>home.delivered).length*2; }

  next() {
    if(this.phase!=='result')return;
    this.day++;
    if(this.invited===8||this.day===6){this.phase='finish';return;}
    do { this.home=(this.home+1)%this.homes.length; } while(this.homes[this.home].delivered);
    this.chief=(this.chief+1)%this.count;
    this.hands.forEach(hand=>hand.push(this.deck.pop()));
    this.startDay();
  }
}

const wombatMachines=['Lanceur','Maillet','Planche'];
const wombatInvaders=[
  ...[0,1,2,3].flatMap(lane=>[{lanes:[lane],rank:1},{lanes:[lane],rank:3}]),
  ...[0,1,2,3].flatMap(first=>[1,2,3].filter(second=>second>first).map(second=>({lanes:[first,second],rank:2}))),
];
const wombatFaces=['invaders','invaders','invaders','charge','charge','machine'];

class WombatWatch {
  constructor(count,first=0,heroic=false,random=Math.random) {
    this.random=random;
    this.count=count;
    this.turn=first;
    this.lanes=Array.from({length:4},()=>[0,heroic?1:0,1]);
    this.invaders=partyShuffle(wombatInvaders,random);
    this.machines=partyShuffle([0,0,1,1,2,2],random);
    this.used=[];
    this.shields=3;
    this.machine=null;
    this.phase='aim';
    this.won=null;
  }

  strike(lane,strength) {
    if(this.phase!=='aim'||!this.lanes[lane])return null;
    const path=this.lanes[lane];
    const power=Math.max(0,Math.min(1,strength));
    let reach=Math.round(power*9)+1;
    if(this.machine===0)reach+=1;
    if(this.machine===1)reach+=2;
    if(this.machine===2)reach+=3;
    const hits=[], nudged=[];
    for(const [index,enemy] of path.entries()){
      reach-=index===0?1:2;
      if(reach<0)break;
      if(!enemy)continue;
      const resistance=enemy===3?4:2;
      if(reach>=resistance){hits.push(index);path[index]=0;reach-=resistance;}
      else {if(reach>0)nudged.push(index);break;}
    }
    if(!this.lanes.some(row=>row.some(Boolean))) {this.end(true);return {hits,nudged,face:null};}
    const face=wombatFaces[Math.floor(this.random()*wombatFaces.length)];
    this.phase='die';
    return {hits,nudged,face};
  }

  effect(face) {
    if(this.phase!=='die')return null;
    if(face==='machine'){
      if(!this.machines.length)this.machines=partyShuffle(this.used.splice(0),this.random);
      this.machine=this.machines.pop();
      this.used.push(this.machine);
      this.phase='aim';
      return {type:'machine',id:this.machine};
    }
    if(face==='charge'||!this.invaders.length){this.phase='charge';return {type:'charge'};}
    const {lanes,rank}=this.invaders.pop();
    for(const lane of lanes){
      const path=this.lanes[lane];
      const free=path.lastIndexOf(0);
      if(free<0){if(this.breakShield())break;}
      else path[free]=rank===3?3:1;
    }
    if(rank===3&&this.won===null)this.push(lanes[0]);
    this.next();
    return {type:'spawn',lanes,rank};
  }

  push(lane) {
    const path=this.lanes[lane];
    const moved=[];
    for(let i=0;i<path.length;i++){
      if(!path[i])continue;
      if(i===0||path[i-1]){if(this.breakShield())break;}
      else { [path[i-1],path[i]]=[path[i],0]; moved.push(i-1); }
    }
    return moved;
  }

  charge(lane) {
    if(this.phase!=='charge'||!this.lanes[lane]?.some(Boolean))return null;
    const moved=this.push(lane);
    this.next();
    return moved;
  }

  next() {
    if(this.won!==null)return;
    this.turn=(this.turn+1)%this.count;
    this.machine=null;
    this.phase='aim';
  }

  breakShield() {
    this.shields--;
    if(!this.shields)this.end(false);
    return this.won!==null;
  }

  end(won){this.won=won;this.phase='finish';}
}
