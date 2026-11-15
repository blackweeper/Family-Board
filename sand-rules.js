const sandNames=['Loutre turquoise','Lièvre corail','Renard doré','Grenouille verte','Raton violet'];
const sandMarks=['≋','❋','☀','❧','✧'];
const sandPebbles=['tail','head','tornado','tide','gust'];

class ShoreRace {
  constructor(count,first,champion,random=Math.random) {
    this.random=random;
    this.turn=first;
    this.phase='turn';
    this.direction=1;
    this.wave=0;
    this.carts=Array(5).fill(0);
    this.podium=[];
    this.bets=Array.from({length:count},()=>Array(3).fill(null));
    this.buckets=Array(5).fill(count-Number(champion));
    const pebbles=partyShuffle(sandPebbles,random);
    this.pebbles=new Map([[3,pebbles[0]],[5,pebbles[1]]]);
    this.events=[];
    this.wind=[];
    this.tornadoPick=null;
    this.notice='';
  }

  get finishLine(){return this.direction===1?7:this.wave;}

  remaining(){return [0,1,2,3,4].filter(id=>!this.podium.includes(id));}

  spin(index=Math.floor(this.random()*6)){
    if(!['turn','gust'].includes(this.phase))return;
    this.wind=[(index+5)%6,index,(index+1)%6].filter(id=>id<5&&!this.podium.includes(id));
    this.notice='';
    if(index===5){
      const start=this.direction===1?this.wave:7;
      this.remaining().filter(id=>this.carts[id]===start).forEach(id=>{this.carts[id]=Math.max(this.wave,Math.min(7,start+2*this.direction));});
      this.direction*=-1;
      this.notice='storm';
      for(const id of this.remaining())if(this.carts[id]===this.finishLine)this.land(id,false);
      this.resolve();
    }else if(this.wind.length)this.phase='sail';
    else this.endTurn();
  }

  move(ids){
    if(this.phase!=='sail'||ids.length<1||ids.length>2||new Set(ids).size!==ids.length||!ids.every(id=>this.wind.includes(id)))return false;
    for(const id of ids){
      if(this.phase==='finish')break;
      this.shift(id,ids.length===1?2:1);
    }
    this.resolve();
    return true;
  }

  shift(id,steps,trigger=true){
    if(!this.remaining().includes(id))return;
    this.carts[id]=Math.max(this.wave,Math.min(7,this.carts[id]+steps*this.direction));
    this.land(id,trigger);
  }

  land(id,trigger){
    const position=this.carts[id];
    if(position===this.finishLine){
      this.podium.push(id);
      this.buckets[id]=0;
      if(this.podium.length===3)this.phase='finish';
    }else if(trigger&&this.pebbles.has(position)){
      this.events.push(this.pebbles.get(position));
      this.pebbles.delete(position);
    }
  }

  resolve(){
    while(this.events.length&&this.phase!=='finish'){
      const effect=this.events.shift();
      this.notice=effect;
      if(effect==='tail'||effect==='head'||effect==='tornado'){
        this.phase=effect;
        this.tornadoPick=null;
        return;
      }
      if(effect==='gust'){this.phase='gust';return;}
      if(effect==='tide'&&this.wave<6){
        const before=this.wave++;
        for(const id of this.remaining()){
          if(this.carts[id]>this.wave)continue;
          this.carts[id]=this.direction===1&&this.carts[id]===before?this.wave:Math.min(7,this.wave+1);
        }
      }
    }
    if(this.phase!=='finish')this.endTurn();
  }

  candidates(){
    const alive=this.remaining();
    if(this.phase==='tornado')return alive.filter(id=>id!==this.tornadoPick);
    if(!['head','tail'].includes(this.phase))return [];
    const distances=alive.map(id=>this.carts[id]*this.direction);
    const edge=this.phase==='head'?Math.max(...distances):Math.min(...distances);
    return alive.filter(id=>this.carts[id]*this.direction===edge);
  }

  pebble(id){
    if(!this.candidates().includes(id))return false;
    if(this.phase==='tornado'){
      if(this.tornadoPick===null){this.tornadoPick=id;return true;}
      const other=this.tornadoPick;
      [this.carts[id],this.carts[other]]=[this.carts[other],this.carts[id]];
    }else this.shift(id,this.phase==='head'?-1:1);
    this.resolve();
    return true;
  }

  canBet(){
    return this.phase==='turn'&&this.buckets.some(Boolean);
  }

  bet(rank,id){
    const old=this.bets[this.turn]?.[rank];
    if(!this.canBet()||!Number.isInteger(rank)||rank<this.podium.length||rank>2||!this.buckets[id]||old===id)return false;
    this.buckets[id]--;
    this.bets[this.turn][rank]=id;
    this.notice='';
    this.endTurn();
    return true;
  }

  score(){
    return this.bets.map(bets=>bets.reduce((total,id,rank)=>total+(this.podium.includes(id)?(this.podium[rank]===id?2:1):0),0));
  }

  endTurn(){
    this.turn=(this.turn+1)%this.bets.length;
    this.wind=[];
    this.phase='turn';
  }
}
