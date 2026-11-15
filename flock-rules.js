const flockSymbols=['♥','☀','❋','★','✦'];
const flockColors=['#7ed4ff','#ffe57c','#e5aaf5','#ff9593','#fff4bb'];
const flockDice=[0,1,2,3,4,4];

class MeadowRace {
  constructor(count,modes,paths,random=Math.random) {
    this.random=random;
    this.round=0;
    this.roller=0;
    this.dice=[];
    this.phase='roll';
    this.winner=null;
    this.teams=Array.from({length:count},(_,i)=>{
      const symbols=partyShuffle(Array.from({length:12},(_,j)=>j%4),random);
      const sheep=symbols.map((symbol,id)=>({id,symbol,row:Math.floor(id/4),col:id%4,kind:'sheep'}));
      if(modes[i]&1)sheep.push({id:12,row:3,col:1,kind:'granny'});
      if(modes[i]&2){
        const parents=sheep.filter(piece=>piece.row===2);
        const parent=parents[Math.floor(random()*parents.length)];
        const spot=this.neighbor(sheep,parent);
        sheep.push({id:13,symbol:parent.symbol,...spot,kind:'lamb'});
      }
      return {sheep,dice:[],done:false,reunite:false,path:paths[i]};
    });
  }

  throwDice() {
    if(this.phase!=='roll')return null;
    const dice=()=>flockDice[Math.floor(this.random()*6)];
    if(this.tied){
      const value=dice();
      this.dice=[value];
      if(this.tied.includes(value)){this.winner=value;this.phase='finish';}
      return this.dice;
    }
    this.dice=[dice(),dice()];
    this.round++;
    this.phase='move';
    this.teams.forEach(team=>{
      team.dice=[...this.dice];
      team.done=false;
      if(team.reunite){
        const lamb=team.sheep.find(piece=>piece.kind==='lamb');
        const family=this.family(team,lamb);
        if(family.every(piece=>piece.row>=6))lamb.row=6;
        else {
          const parents=family.filter(piece=>piece.row<6).sort((a,b)=>Math.abs(a.row-lamb.row)+Math.abs(a.col-lamb.col)-Math.abs(b.row-lamb.row)-Math.abs(b.col-lamb.col));
          const adjacent=parents.map(parent=>this.neighbor(team.sheep.filter(piece=>piece!==lamb),parent)).find(Boolean);
          if(adjacent)Object.assign(lamb,adjacent);
          else if(family.some(piece=>piece.row>=6))lamb.row=6;
        }
        team.reunite=false;team.done=true;team.dice=[];
      }
    });
    this.advanceIfDone();
    return this.dice;
  }

  neighbor(sheep,parent) {
    return [[1,0],[0,1],[0,-1],[-1,0],[1,-1],[1,1],[-1,-1],[-1,1]].map(([rise,side])=>({row:parent.row+rise,col:parent.col+side}))
      .find(({row,col})=>row>=0&&row<6&&col>=0&&col<4&&!sheep.some(piece=>piece.row===row&&piece.col===col));
  }

  family(team,lamb) {
    return team.sheep.filter(piece=>piece.kind==='sheep'&&piece.symbol===lamb.symbol);
  }

  chain(player,id,side) {
    const team=this.teams[player];
    if(this.phase!=='move'||team?.done||![-1,0,1].includes(side))return [];
    const piece=team?.sheep.find(item=>item.id===id);
    if(!piece||piece.kind==='granny'||piece.row>=6||!team.dice.some(symbol=>symbol===4||symbol===piece.symbol))return [];
    const moving=[piece];
    for(let row=piece.row+1,col=piece.col+side;row<6;row++,col+=side){
      if(col<0||col>=4)return [];
      const next=team.sheep.find(item=>item.row===row&&item.col===col);
      if(!next)break;
      moving.push(next);
    }
    return moving;
  }

  push(player,id,side) {
    const moved=this.chain(player,id,side);
    if(!moved.length)return null;
    const team=this.teams[player];
    const symbol=moved[0].symbol;
    const die=team.dice.indexOf(symbol);
    team.dice.splice(die>=0?die:team.dice.indexOf(4),1);
    const before=team.sheep.map(piece=>({...piece}));
    const granny=team.sheep.find(piece=>piece.kind==='granny');
    for(const piece of moved){piece.row++;piece.col+=side;}
    if(granny&&granny.row<6){
      for(const piece of moved.filter(piece=>piece.row>granny.row)){
        const last=Math.min(...team.sheep.filter(other=>other!==piece&&other.row<6).map(other=>other.row));
        const open=[];
        for(let row=last;row>=0;row--)for(let col=0;col<4;col++)open.push({row,col});
        for(let row=last+1;row<granny.row;row++)for(let col=0;col<4;col++)open.push({row,col});
        const spot=open.find(({row,col})=>!team.sheep.some(other=>other!==piece&&other.row===row&&other.col===col));
        const back=before.find(other=>other.id===piece.id);
        Object.assign(piece,spot||back);
      }
    }
    if(!team.dice.length||!this.canPush(player))this.endTeam(player);
    return before.flatMap(from=>{
      const to=team.sheep.find(piece=>piece.id===from.id);
      return from.row!==to.row||from.col!==to.col?[{player,id:to.id,from,to:{...to}}]:[];
    });
  }

  canPush(player) {
    return this.teams[player].sheep.some(piece=>this.chain(player,piece.id,0).length);
  }

  endTeam(player) {
    const team=this.teams[player];
    if(this.phase!=='move'||team.done)return false;
    const lamb=team.sheep.find(piece=>piece.kind==='lamb');
    if(lamb){
      const together=this.family(team,lamb).some(parent=>lamb.row>=6?parent.row>=6:parent.row<6&&Math.abs(parent.row-lamb.row)<=1&&Math.abs(parent.col-lamb.col)<=1);
      team.reunite=!together;
    }
    team.done=true;team.dice=[];
    this.advanceIfDone();
    return true;
  }

  advanceIfDone() {
    if(!this.teams.every(team=>team.done))return;
    const arrived=this.teams.flatMap((team,i)=>team.sheep.every(piece=>piece.row>=6)&&!team.reunite?[i]:[]);
    if(arrived.length===1){this.phase='finish';this.winner=arrived[0];return;}
    if(arrived.length>1)this.tied=arrived;
    else this.roller=(this.roller+1)%this.teams.length;
    this.phase='roll';
  }

  arrived(player) { return this.teams[player].sheep.filter(piece=>piece.row>=6).length; }
}
