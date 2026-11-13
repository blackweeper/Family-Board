const app=document.getElementById('app');
function header(t,s){return '<div class="screen-head"><div><h1>'+t+'</h1><p>'+s+'</p></div><button class="secondary" id="back">← Accueil</button></div>'}function back(){document.getElementById('back').onclick=()=>home('[data-shelf]')}function openGame(id){({prism:prismGame,lagoon:lagoonGame,safari:safariGame,memory:memoryGame,connect:connectGame,dice:diceGame,catapult:catapultGame,slingshot:slingshotGame,quest:questGame,cards:questGame}[id]||home)()}function memoryGame(){let icons=['🐶','🚀','🍓','🐸','⚽','🦄','🎈','🐙'];let deck=[...icons,...icons].sort(()=>Math.random()-.5),open=[],matched=[],turn=1,scores=[0,0],moves=0,lock=false;app.innerHTML=header('Memory Battle','À tour de rôle, trouvez les paires cachées.')+'<div class="panel"><div class="toolbar"><span class="status" id="status">Au tour du joueur 1 🎯</span><button class="secondary" id="restart">Recommencer</button></div><div class="score">Joueur 1 : <b id="s1">0</b>　 Joueur 2 : <b id="s2">0</b>　 Coups : <b id="moves">0</b></div><div class="memory" id="mem"></div></div>';back();const grid=document.getElementById('mem');function draw(){grid.innerHTML=deck.map((v,i)=>'<button class="tile '+(matched.includes(i)?'matched':open.includes(i)?'open':'')+'" data-i="'+i+'">'+(open.includes(i)||matched.includes(i)?v:'✦')+'</button>').join('');grid.querySelectorAll('button').forEach(b=>b.onclick=()=>flip(+b.dataset.i))}function flip(i){if(lock||open.includes(i)||matched.includes(i))return;open.push(i);draw();if(open.length===2){moves++;document.getElementById('moves').textContent=moves;let[a,b]=open;if(deck[a]===deck[b]){matched.push(a,b);scores[turn-1]++;document.getElementById('s'+turn).textContent=scores[turn-1];open=[];draw();if(matched.length===16)toast(scores[0]===scores[1]?'Égalité parfaite !':'Joueur '+(scores[0]>scores[1]?1:2)+' gagne ! Bravo !')}else{lock=true;setTimeout(()=>{if(!grid.isConnected)return;open=[];turn=turn===1?2:1;document.getElementById('status').textContent='Au tour du joueur '+turn+(turn===1?' 🎯':' ⭐');lock=false;draw()},850)}}}draw();document.getElementById('restart').onclick=memoryGame}function connectGame(){let cells=Array(42).fill(0),turn=1,done=false;app.innerHTML=header('Puissance 4','Alignez quatre jetons horizontalement, verticalement ou en diagonale.')+'<div class="panel"><div class="toolbar"><span class="status" id="cs">Joueur 1 🔴 à vous !</span><button class="secondary" id="restart">Nouvelle partie</button></div><div class="board" id="board"></div></div>';back();const board=document.getElementById('board');function draw(){board.innerHTML=cells.map((v,i)=>'<button class="hole" data-i="'+i+'"><span class="disc '+(v===1?'red':v===2?'yellow':'')+'"></span></button>').join('');board.querySelectorAll('button').forEach(b=>b.onclick=()=>drop(+b.dataset.i%7))}function drop(c){if(done)return;for(let r=5;r>=0;r--){let i=r*7+c;if(!cells[i]){cells[i]=turn;draw();if(win(r,c)){document.getElementById('cs').textContent='Joueur '+turn+' gagne ! 🎉';done=true}else if(cells.every(Boolean)){document.getElementById('cs').textContent='Match nul !';done=true}else{turn=turn===1?2:1;document.getElementById('cs').textContent='Joueur '+turn+(turn===1?' 🔴':' 🟡')+' à vous !'}return}}}function win(r,c){for(let[dr,dc]of [[0,1],[1,0],[1,1],[1,-1]]){let n=1;for(let s of [-1,1]){let y=r+dr*s,x=c+dc*s;while(y>=0&&y<6&&x>=0&&x<7&&cells[y*7+x]===turn){n++;y+=dr*s;x+=dc*s}}if(n>=4)return true}return false}draw();document.getElementById('restart').onclick=connectGame}function diceGame(){app.innerHTML=header('Dé magique','Lancez le dé numérique ou utilisez votre vrai dé.')+'<div class="panel center"><div class="die" id="die">⚄</div><div class="big-number" id="num">À toi de jouer !</div><button class="primary" id="roll">Lancer le dé</button></div>';back();document.getElementById('roll').onclick=()=>{let n=1+Math.floor(Math.random()*6);document.getElementById('die').textContent=['⚀','⚁','⚂','⚃','⚄','⚅'][n-1];document.getElementById('num').textContent=n}}function catapultGame(){let score=0;app.innerHTML=header('Catapult Challenge','Touchez le bouton pour lancer et viser la cible !')+'<div class="panel center"><div class="launch"><span class="target">🎯</span><span class="projectile" id="shot">🪨</span></div><h2>Score : <b id="score">0</b></h2><button class="primary" id="fire">Lancer !</button></div>';back();document.getElementById('fire').onclick=()=>{let hit=Math.random()>.35;document.getElementById('shot').style.left=(20+Math.random()*55)+'%';document.getElementById('shot').style.bottom=(25+Math.random()*35)+'%';if(hit)score++;document.getElementById('score').textContent=score;toast(hit?'Touché ! ⭐':'Raté ! Réessaie !')}}const questions=[['Quel animal miaule ?',['Le chat','Le chien','La vache'],0],['Combien font 3 + 2 ?',['4','5','6'],1],['Quelle planète est rouge ?',['Mars','Terre','Jupiter'],0],['Quel fruit est jaune ?',['Fraise','Banane','Myrtille'],1],['Combien de côtés a un triangle ?',['3','4','5'],0]];function questGame(){let i=0,score=0;function draw(){let q=questions[i%questions.length];app.innerHTML=header('Treasure Quest','Ensemble, répondez aux énigmes pour trouver le trésor.')+'<div class="panel center"><div class="eyebrow">ÉNIGME '+(i+1)+'</div><div class="die">🗺️</div><h2>'+q[0]+'</h2><div class="answers">'+q[1].map((a,n)=>'<button class="answer" data-a="'+n+'">'+a+'</button>').join('')+'</div><p>Trésors trouvés : '+score+' ⭐</p></div>';back();document.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{if(+b.dataset.a===q[2]){score++;toast('Bonne réponse ! ⭐')}else toast('Presque ! On continue !');i++;draw()})}draw()}
function slingshotGame(){
 let score=0,shots=0,level=1,raf=0,drag=false,won=false,failed=false,settleTimer=0;
 const birds=[{c:'#e74735',name:'FLAMME'},{c:'#f3c23e',name:'MIEL'},{c:'#4b9fe8',name:'BULLE'}];
 let birdIndex=0,bird=null,blocks=[],pigs=[];
 const W=1100,H=520,floor=448,origin={x:190,y:350};
 app.innerHTML=header('Family Slingshot','Tire sur tes héros pour faire tomber la forteresse !')+
 '<div class="slingshot-panel"><div class="slingshot-top"><div><b id="sl-level">NIVEAU 1</b><small> · DÉTRUIS LES CIBLES</small></div><div class="sl-score">⭐ <span id="sl-score">0</span> <span class="sl-shots">LANCERS : <b id="sl-shots">0</b>/3</span></div><button class="secondary" id="sl-reset">↻ Rejouer</button></div><div class="slingshot-wrap"><canvas id="sl-canvas" width="1100" height="520" aria-label="Jeu de lance-pierre Family Slingshot"></canvas><div class="sl-hint" id="sl-hint">ATTRAPE LE PERSONNAGE ET TIRE VERS L’ARRIÈRE !</div></div><div class="slingshot-bottom"><span>✨ <b id="sl-bird">FLAMME</b></span><span>Vise la forteresse et libère ton doigt !</span><button class="primary" id="sl-next" hidden>Niveau suivant →</button></div></div>';
 back();
 const canvas=document.getElementById('sl-canvas'),ctx=canvas.getContext('2d'),hint=document.getElementById('sl-hint');
 // Sons synthétisés localement : aucune connexion ni fichier audio requis.
 let audio=null;
 function sound(kind){
  try{
   const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
   audio=audio||new AC();if(audio.state==='suspended')audio.resume();
   const now=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
   osc.connect(gain);gain.connect(audio.destination);
   const settings={launch:[180,520,.22,'sawtooth'],hit:[110,65,.16,'triangle'],wood:[240,90,.2,'square'],pig:[620,880,.18,'sine'],win:[520,980,.38,'sine']};
   const s=settings[kind]||settings.hit;osc.type=s[3];osc.frequency.setValueAtTime(s[0],now);osc.frequency.exponentialRampToValueAtTime(Math.max(35,s[1]),now+s[2]);
   gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.16,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+s[2]);
   osc.start(now);osc.stop(now+s[2]+.02);
  }catch(e){}
 }
 function syncHud(){
  document.getElementById('sl-score').textContent=score;
  document.getElementById('sl-shots').textContent=shots;
  document.getElementById('sl-bird').textContent=birds[birdIndex]?.name||'—';
  document.getElementById('sl-level').textContent='NIVEAU '+level;
 }
 function makeLevel(){
  bird={x:origin.x,y:origin.y,vx:0,vy:0,r:25,launched:false,alive:true};
  blocks=[];pigs=[];
  const x=760,base=floor;
  const add=(x,y,w,h,type)=>blocks.push({x,y,w,h,type,vx:0,vy:0,alive:true,dynamic:false,rot:0,hp:type==='stone'?2:1});
  // Structure stable au départ : les éléments ne tombent qu'après un impact.
  add(x,base-104,26,104,'wood');add(x+150,base-104,26,104,'wood');
  add(x+12,base-126,152,22,'wood');
  add(x+18,base-218,24,92,'stone');add(x+136,base-218,24,92,'stone');
  add(x+34,base-240,110,22,'glass');
  add(x+48,base-286,82,24,'wood');
  add(x+63,base-330,52,20,'glass');
  pigs=[{x:x+88,y:base-158,r:24,alive:true},{x:x+88,y:base-270,r:22,alive:true}];
  won=false;failed=false;birdIndex=0;syncHud();
 }
 function nextBird(){
  birdIndex++;
  if(birdIndex<3){bird={x:origin.x,y:origin.y,vx:0,vy:0,r:25,launched:false,alive:true};syncHud()}
  else{failed=true;hint.textContent='PLUS DE LANCERS ! APPUIE SUR REJOUER POUR RETENTER.'}
 }
 function pointerPos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
 canvas.addEventListener('pointerdown',e=>{
  if(!bird||bird.launched||won||failed)return;
  const p=pointerPos(e);if(Math.hypot(p.x-bird.x,p.y-bird.y)<62){drag=true;canvas.setPointerCapture(e.pointerId);e.preventDefault()}
 });
 canvas.addEventListener('pointermove',e=>{
  if(!drag)return;const p=pointerPos(e),dx=p.x-origin.x,dy=p.y-origin.y,d=Math.hypot(dx,dy),max=145;
  if(d>max){p.x=origin.x+dx/d*max;p.y=origin.y+dy/d*max}
  bird.x=p.x;bird.y=p.y;
 });
 canvas.addEventListener('pointerup',()=>{
  if(!drag)return;drag=false;const dx=origin.x-bird.x,dy=origin.y-bird.y;
  if(Math.hypot(dx,dy)<12){bird.x=origin.x;bird.y=origin.y;return}
  bird.vx=dx*.34;bird.vy=dy*.34;bird.launched=true;shots++;sound('launch');syncHud();
  hint.textContent='SUPER TIR ! REGARDE LA FORTERESSE !';
 });
 canvas.addEventListener('pointercancel',()=>{drag=false;if(bird&&!bird.launched){bird.x=origin.x;bird.y=origin.y}});
 function circleRect(cx,cy,r,b){const nx=Math.max(b.x,Math.min(cx,b.x+b.w)),ny=Math.max(b.y,Math.min(cy,b.y+b.h));return Math.hypot(cx-nx,cy-ny)<r}
 function update(){
  if(bird&&bird.launched&&bird.alive){
   bird.vy+=.22;bird.x+=bird.vx;bird.y+=bird.vy;bird.vx*=.998;
   for(const b of blocks){
    if(!b.alive||!circleRect(bird.x,bird.y,bird.r,b))continue;
    b.dynamic=true;b.vx+=bird.vx*.48;b.vy+=bird.vy*.18;
    if(Math.abs(bird.vx)+Math.abs(bird.vy)>10){b.hp--;sound(b.type==='wood'?'wood':'hit');if(b.hp<=0){b.alive=false;score+=b.type==='stone'?35:25}}
    bird.vx*=.48;bird.vy*=.58;syncHud();
   }
   for(const p of pigs){if(p.alive&&Math.hypot(bird.x-p.x,bird.y-p.y)<bird.r+p.r){p.alive=false;score+=100;sound('pig');syncHud()}}
   if(bird.y>floor-bird.r){bird.y=floor-bird.r;bird.vy*=-.28;bird.vx*=.72;if(Math.abs(bird.vx)<1.3&&Math.abs(bird.vy)<1)bird.alive=false}
   if(bird.x>W+90||bird.y>H+80||bird.x< -80)bird.alive=false;
   if(!bird.alive){
    if(pigs.every(p=>!p.alive)){won=true;sound('win');hint.textContent='BRAVO ! FORTERESSE DÉTRUITE ! ⭐';document.getElementById('sl-next').hidden=false}
    else if(shots<3){if(!settleTimer){settleTimer=1;setTimeout(()=>{settleTimer=0;if(!won&&!failed)nextBird()},700)}}
    else{failed=true;hint.textContent='BIEN TENTÉ ! RECOMMENCE POUR BATTRE TON SCORE.'}
   }
  }
  // Gravité uniquement sur les pièces touchées ou soutenues par une pièce déjà déplacée.
  for(const b of blocks){
   if(!b.alive||!b.dynamic)continue;
   b.vy+=.3;b.x+=b.vx;b.y+=b.vy;b.vx*=.985;
   if(b.y+b.h>floor){b.y=floor-b.h;b.vy*=-.16;b.vx*=.75;if(Math.abs(b.vy)<.45)b.vy=0}
   for(const other of blocks){if(other===b||!other.alive||other.dynamic)continue;
    if(b.x<other.x+other.w&&b.x+b.w>other.x&&b.y<other.y+other.h&&b.y+b.h>other.y){
     other.dynamic=true;other.vx+=b.vx*.3;other.vy+=Math.max(0,b.vy)*.25;
    }
   }
   if(Math.abs(b.vx)+Math.abs(b.vy)>22){b.alive=false;score+=10;syncHud()}
  }
  for(const p of pigs){if(!p.alive)continue;for(const b of blocks){if(b.alive&&circleRect(p.x,p.y,p.r,b)){p.y=b.y-p.r-1}}if(p.y>floor-p.r)p.y=floor-p.r}
 }
 function rounded(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
 function cloud(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle='#ffffffc9';ctx.beginPath();ctx.arc(0,12,24,0,7);ctx.arc(26,0,32,0,7);ctx.arc(58,13,24,0,7);ctx.arc(31,22,28,0,7);ctx.fill();ctx.restore()}
 function drawBird(x,y,r,color){
  ctx.save();ctx.translate(x,y);ctx.shadowColor='#25334a66';ctx.shadowBlur=13;
  const g=ctx.createRadialGradient(-9,-12,3,0,0,r+8);g.addColorStop(0,'#fff1d7');g.addColorStop(.22,color);g.addColorStop(1,'#8d302b');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(-8,-7,8,11,-.15,0,7);ctx.ellipse(9,-7,8,11,.15,0,7);ctx.fill();
  ctx.fillStyle='#172236';ctx.beginPath();ctx.arc(-6,-7,3.5,0,7);ctx.arc(11,-7,3.5,0,7);ctx.fill();
  ctx.strokeStyle='#5c2525';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-17,-17);ctx.lineTo(-2,-12);ctx.moveTo(3,-12);ctx.lineTo(18,-18);ctx.stroke();
  ctx.fillStyle='#ffc83d';ctx.beginPath();ctx.moveTo(12,1);ctx.lineTo(36,8);ctx.lineTo(12,15);ctx.closePath();ctx.fill();
  ctx.fillStyle='#ffffff66';ctx.beginPath();ctx.ellipse(-13,11,6,3,-.4,0,7);ctx.fill();ctx.restore();
 }
 function drawPig(p){
  ctx.save();ctx.translate(p.x,p.y);ctx.shadowColor='#0004';ctx.shadowBlur=9;
  const g=ctx.createRadialGradient(-8,-12,2,0,0,p.r+8);g.addColorStop(0,'#d5ff9b');g.addColorStop(.5,'#91d957');g.addColorStop(1,'#438b3d');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,p.r,0,7);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle='#4b9844';ctx.beginPath();ctx.ellipse(-11,-p.r+3,6,11,-.4,0,7);ctx.ellipse(11,-p.r+3,6,11,.4,0,7);ctx.fill();
  ctx.fillStyle='#e8ffbf';ctx.beginPath();ctx.ellipse(0,8,14,9,0,0,7);ctx.fill();
  ctx.fillStyle='#28452b';ctx.beginPath();ctx.arc(-7,-6,2.8,0,7);ctx.arc(7,-6,2.8,0,7);ctx.fill();
  ctx.fillStyle='#477c38';ctx.beginPath();ctx.ellipse(-5,8,2.5,3,0,0,7);ctx.ellipse(5,8,2.5,3,0,0,7);ctx.fill();ctx.restore();
 }
 function drawBlock(b){
  ctx.save();ctx.shadowColor='#24334b55';ctx.shadowBlur=9;ctx.shadowOffsetY=5;
  const wood=b.type==='wood',glass=b.type==='glass';
  const g=ctx.createLinearGradient(b.x,b.y,b.x+b.w,b.y+b.h);
  if(wood){g.addColorStop(0,'#f7bd69');g.addColorStop(.45,'#c9823e');g.addColorStop(1,'#8b4d2b')}
  else if(glass){g.addColorStop(0,'#e6ffff');g.addColorStop(.35,'#83e4fa');g.addColorStop(1,'#3a9cc9')}
  else{g.addColorStop(0,'#d6dce4');g.addColorStop(1,'#75869a')}
  ctx.fillStyle=g;rounded(b.x,b.y,b.w,b.h,wood?6:4);ctx.shadowColor='transparent';ctx.shadowOffsetY=0;
  ctx.strokeStyle=wood?'#754326':glass?'#e8ffff':'#586b7e';ctx.lineWidth=3;ctx.stroke();
  if(wood){ctx.strokeStyle='#ffdc9b99';ctx.lineWidth=2;for(let yy=b.y+7;yy<b.y+b.h;yy+=12){ctx.beginPath();ctx.moveTo(b.x+5,yy);ctx.lineTo(b.x+b.w-5,yy);ctx.stroke()}}
  else if(glass){ctx.strokeStyle='#ffffffbb';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x+5,b.y+b.h-5);ctx.lineTo(b.x+b.w-5,b.y+5);ctx.stroke()}
  else{ctx.strokeStyle='#ffffff55';ctx.lineWidth=2;ctx.strokeRect(b.x+5,b.y+5,b.w-10,b.h-10)}
  ctx.restore();
 }
 function render(){
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#42aaf3');sky.addColorStop(.58,'#bceaff');sky.addColorStop(1,'#f6d9a0');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  const sun=ctx.createRadialGradient(900,80,5,900,80,100);sun.addColorStop(0,'#fff8cf');sun.addColorStop(1,'#fff8cf00');ctx.fillStyle=sun;ctx.fillRect(790,0,220,190);
  cloud(110,80,.9);cloud(450,120,.7);cloud(850,170,.8);
  ctx.fillStyle='#8dc6b0';ctx.beginPath();ctx.moveTo(0,350);ctx.quadraticCurveTo(150,180,340,345);ctx.quadraticCurveTo(500,205,690,345);ctx.quadraticCurveTo(880,180,1100,335);ctx.lineTo(1100,H);ctx.lineTo(0,H);ctx.fill();
  ctx.fillStyle='#66a98a';ctx.beginPath();ctx.moveTo(0,405);ctx.quadraticCurveTo(240,275,460,405);ctx.quadraticCurveTo(740,285,930,390);ctx.quadraticCurveTo(1030,350,1100,375);ctx.lineTo(1100,H);ctx.lineTo(0,H);ctx.fill();
  ctx.fillStyle='#82c94e';ctx.beginPath();ctx.moveTo(0,floor);ctx.quadraticCurveTo(280,floor-9,520,floor);ctx.quadraticCurveTo(800,floor-12,1100,floor);ctx.lineTo(1100,H);ctx.lineTo(0,H);ctx.fill();
  ctx.fillStyle='#6d9e43';ctx.fillRect(0,floor+12,W,10);ctx.fillStyle='#8b5b3d';ctx.fillRect(0,floor+22,W,H-floor-22);
  // Herbe et petites fleurs
  for(let i=0;i<55;i++){const x=(i*83)%W;ctx.fillStyle=i%2?'#d9f18a':'#fff1bd';ctx.beginPath();ctx.arc(x,floor-3-(i%3)*2,2.5,0,7);ctx.fill()}
  // Lance-pierre en bois avec élastique
  ctx.lineCap='round';ctx.strokeStyle='#714329';ctx.lineWidth=19;ctx.beginPath();ctx.moveTo(155,430);ctx.lineTo(155,335);ctx.quadraticCurveTo(110,270,91,302);ctx.moveTo(155,335);ctx.quadraticCurveTo(200,270,219,302);ctx.stroke();
  ctx.strokeStyle='#d79a58';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(155,430);ctx.lineTo(155,335);ctx.quadraticCurveTo(110,270,91,302);ctx.moveTo(155,335);ctx.quadraticCurveTo(200,270,219,302);ctx.stroke();
  ctx.strokeStyle='#4b3026';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(91,302);ctx.lineTo(bird&&!bird.launched?bird.x:origin.x,bird&&!bird.launched?bird.y:origin.y);ctx.moveTo(219,302);ctx.lineTo(bird&&!bird.launched?bird.x:origin.x,bird&&!bird.launched?bird.y:origin.y);ctx.stroke();
  if(drag&&bird){ctx.strokeStyle='#ffffffdd';ctx.setLineDash([9,12]);ctx.lineWidth=4;ctx.beginPath();for(let i=0;i<24;i++){let t=i*.2,x=bird.x+(origin.x-bird.x)*t,y=bird.y+(origin.y-bird.y)*t+.5*.22*t*t*18;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke();ctx.setLineDash([])}
  for(const b of blocks)if(b.alive)drawBlock(b);
  for(const p of pigs)if(p.alive)drawPig(p);
  if(bird&&bird.alive)drawBird(bird.x,bird.y,bird.r,birds[birdIndex]?.c||'#e74735');
  ctx.fillStyle='#ffffffde';ctx.font='900 17px system-ui';ctx.shadowColor='#245078';ctx.shadowBlur=5;ctx.fillText('TIRE EN ARRIÈRE ↙',28,35);ctx.shadowBlur=0;
  if(won||failed){ctx.fillStyle='#14243bbd';rounded(365,185,370,130,25);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='900 30px system-ui';ctx.fillText(won?'NIVEAU RÉUSSI !':'ON RECOMMENCE ?',550,240);ctx.font='bold 17px system-ui';ctx.fillText(won?'Tu es un champion !':'Tu peux y arriver !',550,278);ctx.textAlign='left'}
 }
 function loop(){update();render();raf=requestAnimationFrame(loop)}
 document.getElementById('sl-reset').onclick=()=>{cancelAnimationFrame(raf);score=0;shots=0;level=1;settleTimer=0;makeLevel();hint.textContent='ATTRAPE LE PERSONNAGE ET TIRE VERS L’ARRIÈRE !';document.getElementById('sl-next').hidden=true;loop()};
 document.getElementById('sl-next').onclick=()=>{level++;shots=0;settleTimer=0;makeLevel();hint.textContent='NOUVELLE FORTERESSE : À TOI DE JOUER !';document.getElementById('sl-next').hidden=true};
 makeLevel();loop();
}
function toast(s){let t=document.getElementById('toast');t.textContent=s;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1500)}
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));