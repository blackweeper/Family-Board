const mistSize=12;
const mistTone=['#b9e66f','#ff9585','#88d9ff','#d3a8f5','#ffc987'];
const mistNames=['Feuille','Braise','Onde','Orchidée','Ambre'];
const mistSymbols=['❧','✦','≋','❋','☀'];
const mistShapes=[
  ['#'],
  ['##'],
  ['###','##/#'],
  ['##/##','###/.#.','###/#','##./.##'],
  ['###/..#/..#','###/.#./.#.','##/##/#','###/#/#','.##/##/#','###/#.#'],
  ['####/.#/.#','####/##','###/.#/.##','###/###','###/..#/..##'],
  ['#.#/###/#.#','####/.##/.#','#####/..#/..#','####/.#/.##','###/###/#','##/##/##/#'],
];
const mistCell=(x,y)=>y*mistSize+x;
const mistXY=i=>[i%mistSize,Math.floor(i/mistSize)];
const mistInside=(x,y)=>x>=0&&x<mistSize&&y>=0&&y<mistSize;
const mistPattern=rows=>rows.split('/').flatMap((row,y)=>[...row].flatMap((mark,x)=>mark==='#'?[[x,y]]:[]));
const mistCard=id=>({id,color:Math.floor(id/7),rank:id%7+1});

function mistShape(card,rotation=0,mirror=false){
  const designs=mistShapes[card.rank-1];
  const offset=card.rank===3?[0,1,0,1,1][card.color]:card.rank===4?[1,3,0,2,1][card.color]:card.rank===6?[2,0,3,4,1][card.color]:card.rank===7?[2,1,3,4,0][card.color]:card.color;
  let shape=mistPattern(designs[offset%designs.length]);
  if(mirror)shape=shape.map(([x,y])=>[-x,y]);
  for(let step=0;step<rotation;step++)shape=shape.map(([x,y])=>[-y,x]);
  const left=Math.min(...shape.map(([x])=>x)),top=Math.min(...shape.map(([,y])=>y));
  return shape.map(([x,y])=>[x-left,y-top]);
}

const mistScenarios=[
  ['Les deux sanctuaires','woods',[[6,4,'###/..#/..#'],[3,8,'##/##']],[[6,5,3],[7,5,3],[7,6,3],[8,7,1],[3,10,0],[4,10,0]]],
  ['Le passage des lianes','woods',[[6,4,'##/##'],[2,5,'..##/####']],[[7,3,3],[2,7,0],[3,7,0],[4,7,0]]],
  ['La source du geai','water',[[4,4,'###']],[[5,3,2]]],
  ['Les racines jumelles','woods',[[3,4,'#'],[7,6,'##']],[[8,7,0]]],
  ['Le miroir des roseaux','water',[[5,4,'##/.#']],[[6,3,2],[7,5,2]]],
  ['Les cloches de brume','mist',[[3,6,'##'],[8,4,'#']],[[8,3,3]]],
  ['La clairière des braises','woods',[[5,4,'###/.#.']],[[5,3,1],[6,3,1]]],
  ['L’escalier des rives','water',[[4,4,'##/.##']],[[7,5,2]]],
  ['Les pétales de lune','mist',[[3,5,'#'],[8,6,'#']],[[3,4,3],[8,7,3]]],
  ['Les pattes du gardien','woods',[[5,4,'##/##'],[7,7,'#']],[[4,5,0],[7,8,4]]],
  ['La confluence','water',[[4,5,'###/..#'],[8,4,'#']],[[4,4,2],[9,4,2]]],
  ['La ronde des lanternes','mist',[[5,4,'#.#/###']],[[6,4,4]]],
  ['Les rochers de nacre','water',[[3,5,'##'],[8,5,'##']],[[2,5,2],[10,5,4]]],
  ['La forêt des murmures','mist',[[5,4,'##/##/..']],[[5,3,0],[6,6,3]]],
  ['Les branches du couchant','woods',[[4,5,'###/.#'],[8,7,'#']],[[4,4,1],[8,6,4]]],
  ['L’île des trois lunes','water',[[3,4,'#'],[8,4,'#'],[6,8,'#']],[[6,7,2],[7,4,3]]],
  ['L’écho des fleurs','mist',[[4,5,'##/.#'],[7,6,'##']],[[4,4,3],[9,6,0]]],
  ['Le jardin submergé','water',[[4,4,'##/##'],[7,7,'#']],[[4,3,2],[5,3,2],[7,8,4]]],
  ['L’aile d’ambre','woods',[[4,4,'..#/###/..#']],[[5,4,4],[5,6,4]]],
  ['Les statues du crépuscule','mist',[[2,5,'##'],[6,4,'#'],[9,6,'#']],[[2,4,0],[6,3,3],[9,7,1]]],
  ['Le dernier gué','water',[[4,5,'###/..#'],[8,6,'#']],[[4,4,2],[7,6,2]]],
  ['Le cœur des lianes','mist',[[5,4,'###/.#./.##'],[8,7,'#']],[[5,3,0],[6,3,0],[8,4,1],[9,7,3],[8,8,4]]],
];

function mistMission(index,relics=0) {
  const [name,land,figures,edges]=mistScenarios[index];
  const goals=figures.flatMap(([x,y,pattern],group)=>mistPattern(pattern).map(([dx,dy])=>({cell:mistCell(x+dx,y+dy),group})));
  const blocked=new Set(goals.map(goal=>goal.cell));
  const ring=new Map();
  for(const {cell} of goals){
    const [x,y]=mistXY(cell);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const neighbor=mistCell(x+dx,y+dy);
      if(mistInside(x+dx,y+dy)&&!blocked.has(neighbor))ring.set(neighbor,null);
    }
  }
  edges.slice(0,index===21?Math.max(1,edges.length-relics):undefined).forEach(([x,y,tone])=>{if(ring.has(mistCell(x,y)))ring.set(mistCell(x,y),tone);});
  const hazards=new Map();
  const night=index>=12&&land!=='woods';
  if(land!=='woods'){
    const candidates=[...ring.keys()].filter(cell=>ring.get(cell)===null);
    const fixed=[mistCell(3,3),mistCell(9,8),mistCell(2,8)];
    const options=night?[candidates[Math.floor(candidates.length/2)],candidates.at(-1),...fixed]:fixed;
    for(const [i,cell] of options.entries())if(!blocked.has(cell)&&!hazards.has(cell))hazards.set(cell,land==='water'?'water':(index+i*2)%5);
  }
  return {name,land,goals,ring,hazards,night};
}

class MistJourney {
  constructor(count,mission,record,random=Math.random){
    this.random=random;this.count=count;this.seats=count===2?3:count;
    const relics=record.cleared.filter(i=>[8,14,19].includes(i)).length;
    this.mission=mistMission(mission,relics);
    this.index=mission;
    this.phase='trick';this.round=0;
    this.turn=Math.floor(random()*count);this.leader=this.turn;
    this.trump=1;this.trick=[];this.history=[];this.night=this.mission.night||record.attempts>=16;
    this.maxRounds=7;
    this.lunar=record.attempts>=6?1:0;
    const deck=partyShuffle(Array.from({length:35},(_,id)=>mistCard(id)),random);
    this.hands=Array.from({length:this.seats},(_,i)=>deck.splice(0,(count===4?i===3?8:9:10)-this.lunar).sort((a,b)=>a.id-b.id));
    this.hidden=count===2?this.hands[2].splice(4):[];
    this.grid=Array(144).fill(null);
    for(const goal of this.mission.goals)this.grid[goal.cell]={type:'goal',group:goal.group};
    this.hazards=new Map(this.mission.hazards);
    if(record.attempts>=11&&!this.hazards.has(27)&&!this.grid[27])this.hazards.set(27,3);
    this.power=record.cleared.includes(1)?(record.cleared.includes(6)?2:1):0;
    this.required=null;this.won=null;this.tiles=[];
  }

  options(seat=this.turn){
    const hand=this.hands[seat], lead=this.trick[0]?.card.color;
    const asked=lead===undefined?this.required:[lead];
    const valid=asked?.length?hand.filter(card=>asked.includes(card.color)):[];
    return {cards:valid.length?valid:hand, draw:this.count===2&&seat===2&&!valid.length&&this.hidden.length>0};
  }

  play(id){
    if(this.phase!=='trick')return null;
    const {cards,draw}=this.options();
    const blind=id===-1&&draw;
    if(!blind&&!cards.some(card=>card.id===id))return null;
    const seat=this.turn,hand=this.hands[seat];
    const card=blind?this.hidden.pop():hand.splice(hand.findIndex(item=>item.id===id),1)[0];
    if(!blind&&this.count===2&&seat===2&&this.hidden.length)hand.push(this.hidden.pop());
    this.trick.push({seat,card});
    this.turn=(seat+1)%this.seats;
    if(this.trick.length===this.seats){
      const relevant=this.trick.some(item=>item.card.color===this.trump)?this.trump:this.trick[0].card.color;
      const winner=this.trick.filter(item=>item.card.color===relevant).sort((a,b)=>b.card.rank-a.card.rank)[0];
      this.tile=winner.card;this.turn=winner.seat;this.trump=winner.card.color;this.required=null;
      if(winner.seat<this.count)this.leader=winner.seat;
      this.phase='place';
    }
    return card;
  }

  fit(anchor,shape,ignore=-1){
    if(!Number.isInteger(anchor)||anchor<0||anchor>=144)return null;
    const [x,y]=mistXY(anchor);
    const places=[];
    for(const [dx,dy] of shape){
      if(!mistInside(x+dx,y+dy))return null;
      const cell=mistCell(x+dx,y+dy), item=this.grid[cell];
      if(item&&(item.type==='goal'||item.tile!==ignore))return null;
      places.push(cell);
    }
    return places;
  }

  validPlacement(){
    return [false,true].some(mirror=>[0,1,2,3].some(turn=>this.grid.some((_,anchor)=>this.fit(anchor,mistShape(this.tile,turn,mirror)))));
  }

  put(anchor,rotation,mirror){
    if(this.phase!=='place')return false;
    const shape=mistShape(this.tile,rotation,mirror),cells=this.fit(anchor,shape);
    if(!cells)return false;
    const index=this.tiles.length;
    this.tiles.push({card:this.tile,cells,rotation,mirror});
    this.applyTile(cells,this.tile.color,index);
    this.history.push(this.tile);
    this.round++;
    if(this.check())this.finish(true);
    else if(this.round===this.maxRounds)this.finish(false);
    else if(this.discards){
      this.phase='discard';this.discardOrder=Array.from({length:this.count},(_,i)=>(this.leader+i)%this.count).filter(i=>this.hands[i].length);
      if(this.count===2){
        for(let j=0;j<this.discards;j++){
          if(this.hidden.length)this.hidden.pop();
          else this.hands[2].pop();
        }
      }
      if(!this.discardOrder.length)this.nextTrick();
    }else this.nextTrick();
    return true;
  }

  applyTile(cells,color,index){
    for(const cell of cells){
      this.grid[cell]={type:'spirit',color,tile:index};
      if(!this.hazards.has(cell))continue;
      const hazard=this.hazards.get(cell);
      this.hazards.delete(cell);
      if(hazard==='water')this.discards=(this.discards??0)+1;
      else this.required=[...new Set([...(this.required??[]),hazard])];
    }
  }

  discard(seat,id){
    if(this.phase!=='discard'||seat!==this.discardOrder[0])return false;
    const hand=this.hands[seat],at=hand.findIndex(card=>card.id===id);
    if(at<0)return false;
    hand.splice(at,1);
    this.discardOrder.shift();
    if(!this.discardOrder.length){
      this.discards--;
      if(this.discards>0)this.discardOrder=Array.from({length:this.count},(_,i)=>(this.leader+i)%this.count).filter(i=>this.hands[i].length);
      if(!this.discardOrder.length)this.nextTrick();
    }
    return true;
  }

  nextTrick(){
    this.discards=0;this.trick=[];
    if(this.hands.some((hand,i)=>!hand.length&&!(i===2&&this.count===2&&this.hidden.length)))this.finish(false);
    else this.phase='trick';
  }

  missing(){
    return [...this.mission.ring].filter(([cell,color])=>!this.grid[cell]||(color!==null&&this.grid[cell].color!==color)).length;
  }

  check(){
    return !this.missing()&&(!this.night||![...this.hazards.keys()].some(cell=>this.mission.ring.has(cell)));
  }

  shiftTile(index,anchor,rotation,mirror){
    if(this.phase!=='place'||!this.power||!this.tiles[index])return false;
    const tile=this.tiles[index];
    const cells=this.fit(anchor,mistShape(tile.card,rotation,mirror),index);
    if(!cells||cells.every(cell=>tile.cells.includes(cell)))return false;
    for(const old of tile.cells)this.grid[old]=null;
    Object.assign(tile,{cells,rotation,mirror});
    this.applyTile(cells,tile.card.color,index);
    this.power--;
    return true;
  }

  finish(won){this.won=won;this.phase='finish';}
}
