const magnetWidth=1000,magnetHeight=600,magnetDiameter=42;
const magnetSpots=Array.from({length:18},(_,i)=>({
  x:132+(i%6)*144+(Math.floor(i/6)%2)*14,
  y:134+Math.floor(i/6)*158+((i%6)%2)*22,
}));
const magnetLaunches=[
  [{x:500,y:553},{x:500,y:47}],
  [{x:500,y:553},{x:938,y:302},{x:500,y:47}],
  [{x:500,y:553},{x:938,y:302},{x:500,y:47},{x:62,y:302}],
  [{x:500,y:553},{x:938,y:417},{x:938,y:184},{x:500,y:47},{x:62,y:302}],
];
const magnetBond=(a,b)=>a<b?a+':'+b:b+':'+a;

class MagnetMatch {
  constructor(count,minimum=2,random=Math.random) {
    this.minimum=minimum;
    this.turn=0;
    this.phase='pick';
    this.score=Array.from({length:count},()=>[]);
    const polarity=partyShuffle(magnetSpots.map((_,i)=>i%2),random);
    this.board=magnetSpots.map(({x,y},id)=>({id,x,y,pole:polarity[id],vx:0,vy:0}));
    this.bonds=new Set();
    this.projectile=null;
    this.groups=[];
    this.out=[];
    this.winners=[];
    this.note='';
  }

  get origin(){return magnetLaunches[this.score.length-2][this.turn];}

  pick(id){
    if(this.phase!=='pick')return false;
    const index=this.board.findIndex(item=>item.id===id);
    if(index<0)return false;
    this.projectile=this.board.splice(index,1)[0];
    this.removeBonds(id);
    this.phase='aim';
    return true;
  }

  removeBonds(id){
    for(const value of this.bonds)if(value.split(':').map(Number).includes(id))this.bonds.delete(value);
  }

  flip(){
    if(this.phase!=='aim')return;
    this.projectile.pole=1-this.projectile.pole;
  }

  launch(x,y,power){
    if(this.phase!=='aim'||![x,y,power].every(Number.isFinite))return false;
    const dx=x-this.origin.x,dy=y-this.origin.y;
    const distance=Math.hypot(dx,dy);
    if(distance<12)return false;
    const speed=7+19*Math.max(0,Math.min(1,power));
    Object.assign(this.projectile,this.origin,{vx:dx*speed/distance,vy:dy*speed/distance});
    this.board.push(this.projectile);
    this.initialBonds=new Set(this.bonds);
    this.note='';
    this.frame=0;
    this.phase='flight';
    return true;
  }

  step(){
    if(this.phase!=='flight')return;
    this.frame++;
    for(let i=0;i<this.board.length;i++)for(let j=i+1;j<this.board.length;j++)this.interact(this.board[i],this.board[j]);
    for(const piece of this.board){
      piece.x+=piece.vx;piece.y+=piece.vy;
      piece.vx*=.944;piece.vy*=.944;
    }
    const away=this.board.filter(({x,y})=>x< -18||x>magnetWidth+18||y< -18||y>magnetHeight+18);
    if(away.length){
      for(const item of away){
        this.out.push({...item,catchable:Math.hypot(item.vx,item.vy)>6});
        this.removeBonds(item.id);
      }
      this.board=this.board.filter(piece=>!away.includes(piece));
    }
    if(this.frame>=145||(this.frame>15&&this.board.every(piece=>Math.hypot(piece.vx,piece.vy)<.26)))this.settle();
  }

  interact(a,b){
    const dx=b.x-a.x,dy=b.y-a.y;
    const distance=Math.hypot(dx,dy)||.001;
    const nx=distance===.001?1:dx/distance,ny=dy/distance;
    const key=magnetBond(a.id,b.id);
    if(this.bonds.has(key)){
      const error=(distance-magnetDiameter)*.26;
      a.x+=nx*error;a.y+=ny*error;b.x-=nx*error;b.y-=ny*error;
      const vx=(a.vx+b.vx)/2,vy=(a.vy+b.vy)/2;
      a.vx+=(vx-a.vx)*.55;a.vy+=(vy-a.vy)*.55;
      b.vx+=(vx-b.vx)*.55;b.vy+=(vy-b.vy)*.55;
      return;
    }
    const attraction=a.pole!==b.pole;
    if(distance<108&&(a===this.projectile||b===this.projectile||Math.hypot(a.vx,a.vy,b.vx,b.vy)>.32)){
      const force=(1-distance/108)**1.75*(attraction?3.25:-2.15);
      a.vx+=nx*force;a.vy+=ny*force;b.vx-=nx*force;b.vy-=ny*force;
    }
    if(distance>magnetDiameter)return;
    const overlap=(magnetDiameter-distance)*.51;
    a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;
    if(attraction){
      const vx=(a.vx+b.vx)*.44,vy=(a.vy+b.vy)*.44;
      a.vx=vx;a.vy=vy;b.vx=vx;b.vy=vy;
      this.bonds.add(key);
    }else{
      const impact=Math.max(.7,((a.vx-b.vx)*nx+(a.vy-b.vy)*ny)*.82);
      a.vx-=nx*impact;a.vy-=ny*impact;b.vx+=nx*impact;b.vy+=ny*impact;
    }
  }

  settle(){
    const visited=new Set(), groups=[];
    for(const piece of this.board){
      if(visited.has(piece.id))continue;
      const group=new Set([piece.id]);
      for(const id of group){
        for(const key of this.bonds){
          const [a,b]=key.split(':').map(Number);
          if(id===a)group.add(b);
          if(id===b)group.add(a);
        }
      }
      group.forEach(id=>visited.add(id));
      if(group.size>=this.minimum&&[...this.bonds].some(key=>!this.initialBonds.has(key)&&group.has(Number(key.split(':')[0]))))groups.push([...group]);
    }
    this.board.forEach(piece=>{piece.vx=0;piece.vy=0;});
    this.groups=groups;
    this.projectile=null;
    if(this.out.length)this.phase=this.out[0].catchable?'catch':'return';
    else this.afterOut();
  }

  catchOut(player){
    if(this.phase!=='catch'||!this.score[player])return false;
    this.score[player].push(this.out.shift());
    this.afterOut();
    return true;
  }

  missOut(){
    if(this.phase!=='catch')return false;
    this.phase='return';
    return true;
  }

  freeSpots(){
    return magnetSpots.flatMap(({x,y},i)=>this.board.every(piece=>Math.hypot(x-piece.x,y-piece.y)>magnetDiameter+5)?[i]:[]);
  }

  returnOut(spot){
    if(this.phase!=='return')return false;
    const free=this.freeSpots();
    if(free.length&&!free.includes(spot))return false;
    const piece=this.out.shift();
    const {x,y}=magnetSpots[spot]??this.origin;
    Object.assign(piece,{x,y,vx:0,vy:0});
    this.board.push(piece);
    this.afterOut();
    return true;
  }

  afterOut(){
    if(this.out.length){this.phase=this.out[0].catchable?'catch':'return';return;}
    if(this.groups.length>1){this.phase='capture';return;}
    if(this.groups.length===1){this.phase='capture';this.capture(0);return;}
    this.note='Aucun groupe';
    this.next();
  }

  capture(index){
    if(this.phase!=='capture'||!this.groups[index])return false;
    const ids=this.groups[index];
    this.score[this.turn].push(...this.board.filter(piece=>ids.includes(piece.id)));
    this.board=this.board.filter(piece=>!ids.includes(piece.id));
    ids.forEach(id=>this.removeBonds(id));
    this.groups=[];
    this.note=ids.length+' cœurs capturés !';
    this.next();
    return true;
  }

  next(){
    if(this.board.length<=2){
      const best=Math.max(...this.score.map(reserve=>reserve.length));
      this.winners=this.score.flatMap((reserve,i)=>reserve.length===best?[i]:[]);
      this.phase='finish';
      return;
    }
    this.turn=(this.turn+1)%this.score.length;
    this.projectile=this.score[this.turn].pop()??null;
    this.phase=this.projectile?'aim':'pick';
  }
}
