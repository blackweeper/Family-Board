const mudRules = `<h2>À la mare !</h2><ol><li>Le plus jeune commence. À ton tour, joue une carte pour avancer ou pioche jusqu’à en avoir trois. Le joker permet de choisir de 1 à 5 pas. Si la case d’arrivée est occupée, avance jusqu’à la prochaine libre.</li><li>Une case peut donner de la boue, des cartes, un nouveau tour, un déplacement surprise ou un échange de positions. À la toilette, chaque adversaire donne une motte s’il en a sur sa bassine en cours.</li><li>À la grange, touche le plongeoir pour choisir la force du saut. Les mottes qui touchent un autre cochon lui reviennent. Celles qui tombent ailleurs sont pour toi. Ton cochon reste dans la mare jusqu’à ton prochain déplacement.</li><li>Une bassine complète se retourne et ses quatre mottes retournent à la mare. Remplis quatre bassines, ou trois à quatre joueurs. Les joueurs qui terminent pendant le même tour partagent la victoire.</li></ol><p>Adaptation de Plonge Cochon !, de Carlo Molinari et Martino Chiacchiera, édité par Schmidt. <a href="https://www.youtube.com/watch?v=nk6bZpLQrrA" target="_blank" rel="noopener">Vidéo des règles</a></p>`;
const mudNames=['Pistache','Biscotte','Rosette','Trèfle'];
const mudColors=['#99ddfa','#ffe38e','#ffabbd','#bdeb98'];
const mudSquares=[[77,82],[64,86],[50,88],[33,84],[19,62],[10,54],[12,39],[18,26],[30,19],[46,15],[64,16],[78,24],[84,48],[93,54],[91,65],[87,76]];
const mudMarks={mud1:'●',mud2:'●●',mud3:'●●●',draw1:'+▰',draw3:'+▰▰',extra:'↻',barn:'⬇',wash:'◉',wild:'➜',swap:'⇄'};
const mudLabels={mud1:'Une motte',mud2:'Deux mottes',mud3:'Trois mottes',draw1:'Une carte',draw3:'Jusqu’à trois cartes',extra:'Rejoue',barn:'À toi de plonger !',wash:'Toilette des autres cochons',wild:'Carte surprise',swap:'Échange de place'};
const mudPig=id=>`<span class="mud-pig" aria-hidden="true" style="--pig-x:${id*100/3}%"></span>`;

function mudGame() {
  let count=2, first=0, lineup=[0,1,2,3], selected=0, game, timer, frame, generation=0, busy=false, muted=false, power=0, launchAt;
  const soundtrack=familyMusic();
  const effects=partyEffects();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  app.innerHTML=`<section class="party mud"><div class="party-bar"><button class="secondary" id="back">← Jeux</button><button class="secondary" data-mud-sound aria-pressed="true">♪ Son</button><button class="secondary" data-mud-rules>? Règles</button></div><div class="mud-stage"></div><dialog class="party-rules">${mudRules}<form method="dialog"><button class="party-primary">Fermer</button></form></dialog></section>`;
  const root=app.querySelector('.mud');
  const stage=root.querySelector('.mud-stage');
  const dialog=root.querySelector('dialog');
  const focus=selector=>stage.querySelector(selector)?.focus({preventScroll:true});
  const later=(callback,delay)=>{const run=generation;timer=setTimeout(()=>{if(run===generation)callback();},reduced.matches?12:delay);};

  function reset() {
    generation++;
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    busy=false;
  }

  function setup() {
    reset(); soundtrack.stop(); game=null;
    stage.innerHTML=`<div class="party-intro mud-intro"><h1 class="party-sr">Plongée dans la boue</h1><div class="party-config"><fieldset><legend>Joueurs</legend><div class="party-options">${[2,3,4].map(n=>`<button data-mud-count="${n}" aria-pressed="${n===count}">${n}</button>`).join('')}</div></fieldset><fieldset><legend>Choisis ton cochon</legend><div class="party-options mud-lineup">${lineup.slice(0,count).map((id,i)=>`<button data-mud-seat="${i}" aria-pressed="${i===selected}" aria-label="Joueur ${i+1}, ${mudNames[id]}">${mudPig(id)}<b>${i+1}</b></button>`).join('')}</div><div class="party-options mud-lineup">${mudNames.map((name,id)=>`<button data-mud-avatar="${id}" aria-pressed="${lineup[selected]===id}" aria-label="${name}">${mudPig(id)}</button>`).join('')}</div></fieldset><label>Le plus jeune <select data-mud-first>${lineup.slice(0,count).map((id,i)=>`<option value="${i}" ${i===first?'selected':''}>${mudNames[id]}</option>`).join('')}</select></label><button class="party-primary" data-mud-start>▶ Jouer</button></div></div>`;
  }

  function trays(player) {
    return `<div class="mud-trays" aria-label="${player.mud} mottes sur ${game.goal}">${Array.from({length:game.goal/4},(_,i)=>{
      const filled=Math.max(0,Math.min(4,player.mud-i*4));
      return `<div class="mud-tray" data-full="${filled===4}">${filled===4?'★':Array.from({length:4},(_,j)=>`<i ${j<filled?'data-filled':''}></i>`).join('')}</div>`;
    }).join('')}</div>`;
  }

  function turnPanel(p,seat) {
    const active=game.turn===seat;
    return `<article class="mud-player" style="--seat:${mudColors[p.id]}" data-active="${active}"><header>${mudPig(p.id)}<b>${mudNames[p.id]}</b>${trays(p)}</header>${active?`<div class="mud-hand">${p.hand.map((card,i)=>`<button data-mud-card="${i}" ${busy||game.phase!=='choose'?'disabled':''} aria-label="${card==='joker'?'Joker':card+' pas'}"><b>${card==='joker'?'✦':card}</b><small>${card==='joker'?'1–5':'●'.repeat(card)}</small></button>`).join('')}<button class="mud-draw" data-mud-draw ${busy||game.phase!=='choose'||p.hand.length===3?'disabled':''} aria-label="Piocher jusqu’à trois cartes">▰＋</button></div>`:''}</article>`;
  }

  function render(note='',fresh=[]) {
    const {phase,turn}=game;
    const current=game.participant();
    stage.innerHTML=`<div class="mud-table" data-phase="${phase}"><div class="mud-grounds"><div class="mud-turn" role="status" style="--seat:${mudColors[current.id]}">${mudPig(current.id)}<div><b>${mudNames[current.id]}</b><small>${note||'Choisis une carte ou pioche'}</small></div></div>
        ${mudSquares.map(([x,y],i)=>`<span class="mud-square ${fresh.includes(i)?'fresh':''}" data-mud-field="${i}" data-kind="${mudTrack[i]}" style="--x:${x}%;--y:${y}%" role="img" aria-label="${mudLabels[mudTrack[i]]}">${mudMarks[mudTrack[i]]}${i===0?'<i class="mud-start-arrow" aria-hidden="true">◀</i>':''}</span>`).join('')}
        ${game.players.map((p,i)=>{const [x,y]=p.pos>=0?mudSquares[p.pos]:[43+i%2*12,47+Math.floor(i/2)*12];return `<span class="mud-piece" data-piece-seat="${i}" style="--x:${x}%;--y:${y}%;--seat:${mudColors[p.id]}">${mudPig(p.id)}</span>`;}).join('')}
        ${phase==='barn'?`<div class="mud-dive"><button data-mud-dive class="party-primary" aria-label="Plonger"><span class="mud-power"><i></i></span>⬇ Plonger</button></div>`:''}</div>
      <div class="mud-players">${game.players.map(turnPanel).join('')}</div>
      ${phase==='joker'?`<div class="party-overlay"><div class="party-popup"><h2>✦ Choisis tes pas</h2><div class="party-options">${[1,2,3,4,5].map(n=>`<button data-mud-steps="${n}">${n}</button>`).join('')}</div></div></div>`:''}
      ${phase==='swap'?`<div class="party-overlay"><div class="party-popup"><h2>⇄ Échange de place</h2><div class="party-options mud-lineup">${game.players.flatMap((p,i)=>i===turn?[]:[`<button data-mud-swap="${i}" aria-label="${mudNames[p.id]}">${mudPig(p.id)}</button>`]).join('')}</div></div></div>`:''}</div>`;
  }

  function turnEnd(extra=false) {
    cancelAnimationFrame(frame);
    game.end(extra); busy=false;
    if (game.winners.length) {
      soundtrack.stop();
      effects.play([440,587,740,880,1175],muted);
      stage.innerHTML=`<div class="party-finish mud-finish">${partyConfetti()}<div class="party-trophy">🏆</div><h2>${game.winners.length>1?'Victoire partagée !':mudNames[game.players[game.winners[0]].id]+' gagne !'}</h2><div class="party-champions">${game.winners.map(seat=>`<div style="--seat:${mudColors[game.players[seat].id]}">${mudPig(game.players[seat].id)}${trays(game.players[seat])}</div>`).join('')}</div><div class="party-options"><button data-mud-start class="party-primary">↻ Rejouer</button><button data-mud-setup>Réglages</button></div></div>`;
      focus('[data-mud-start]');
    } else {render(extra?'Encore à toi !':'');focus('[data-mud-card]:enabled,[data-mud-draw]:enabled');}
  }

  function walk(path) {
    if (!path) {busy=false;render();focus('[data-mud-steps]');return;}
    busy=true;
    if(reduced.matches){game.participant().pos=path.at(-1);land();return;}
    const walkStep=i=>{
      const field=path[i];
      game.participant().pos=field;
      render('En route !',[field]);
      stage.querySelector(`[data-piece-seat="${game.turn}"]`).classList.add('hopping');
      later(()=>i+1<path.length?walkStep(i+1):land(),145);
    };
    walkStep(0);
  }

  function land() {
    const pos=game.participant().pos;
    if(pos<0){turnEnd();return;}
    const {event,gains}=game.land();
    render(mudLabels[event],[pos]);
    if(event==='barn'){
      busy=false; power=0; launchAt=undefined;
      const tick=t=>{
        if(game.phase!=='barn'||!root.isConnected)return;
        if(launchAt===undefined)launchAt=t;
        const cycle=((t-launchAt)/1040)%2;
        power=cycle<1?cycle:2-cycle;
        stage.querySelector('.mud-power i')?.style.setProperty('scale',`${power} 1`);
        frame=requestAnimationFrame(tick);
      };
      if(reduced.matches)power=.67;
      else frame=requestAnimationFrame(tick);
      focus('[data-mud-dive]');
    } else if(event==='swap'){
      busy=false; focus('[data-mud-swap]');
    } else if(event==='wild'){
      const card=game.take(game.participant());
      later(()=>card===undefined?turnEnd():walk(game.play(card)),460);
    } else {
      if(gains.some(n=>n))stage.querySelectorAll('.mud-player').forEach((card,i)=>{if(gains[i])card.classList.add('mud-glow');});
      if(gains.some(n=>n>0))effects.play([349,523,698],muted);
      later(()=>turnEnd(event==='extra'),620);
    }
  }

  function dive() {
    busy=true;
    cancelAnimationFrame(frame);
    const pig=stage.querySelector(`[data-piece-seat="${game.turn}"]`);
    const [x,y]=mudSquares[game.participant().pos];
    const ground=stage.querySelector('.mud-grounds');
    const dx=(50-x)*ground.clientWidth/100, dy=(52-y)*ground.clientHeight/100;
    if(!reduced.matches&&pig.animate)pig.animate([
      { transform:'translate(0,0) rotate(0)' },
      { transform:`translate(${dx*.56}px,${dy*.56-72}px) rotate(-22deg) scale(1.2)`,offset:.44 },
      { transform:`translate(${dx}px,${dy}px) rotate(150deg) scale(.52)`,opacity:.18 },
    ],{ duration:620,easing:'ease-in-out',fill:'forwards' });
    effects.play([520,700],muted);
    stage.querySelector('.mud-dive').remove();
    later(()=>{
      const drops=game.splash(power);
      effects.play([202,130,250,315],muted);
      render(drops.length?'Éclaboussure !':'Petit plongeon !');
      const arena=stage.querySelector('.mud-grounds');
      arena.insertAdjacentHTML('beforeend',`<i class="mud-ripple"></i>${drops.map(({field},i)=>{const [x,y]=mudSquares[field];return `<i class="mud-drop" style="--dx:${x-50};--dy:${y-52};--delay:${i*43}ms"></i>`;}).join('')}`);
      stage.querySelectorAll('.mud-player').forEach((card,seat)=>{
        const received=drops.filter(drop=>drop.owners.includes(seat)).length;
        if(received){card.classList.add('mud-glow');card.insertAdjacentHTML('beforeend',`<span class="mud-received" aria-label="${received} mottes gagnées">+${received}</span>`);}
      });
      later(()=>turnEnd(),900);
    },640);
  }

  root.addEventListener('change',e=>{if(e.target.matches('[data-mud-first]'))first=Number(e.target.value);});
  root.addEventListener('click',e=>{
    const button=e.target.closest('button');
    if(!button||button.disabled)return;
    const d=button.dataset;
    if(button.id==='back'){reset();soundtrack.close();effects.close();home('[data-detail="mud"]');}
    else if('mudRules' in d)dialog.showModal();
    else if('mudSound' in d){muted=!muted;partyMute(button,soundtrack,muted);if(muted)effects.close();}
    else if('mudCount' in d){count=Number(d.mudCount);first=Math.min(first,count-1);selected=Math.min(selected,count-1);setup();focus(`[data-mud-count="${count}"]`);}
    else if('mudSeat' in d||'mudAvatar' in d){
      if('mudSeat' in d)selected=Number(d.mudSeat);
      else {const id=Number(d.mudAvatar), prior=lineup.indexOf(id);[lineup[selected],lineup[prior]]=[lineup[prior],lineup[selected]];}
      setup();focus('mudSeat' in d?`[data-mud-seat="${selected}"]`:`[data-mud-avatar="${lineup[selected]}"]`);
    }else if('mudStart' in d){reset();game=new MudDive(lineup.slice(0,count),first);soundtrack.start('mud');render();focus('[data-mud-card]');}
    else if('mudSetup' in d)setup();
    else if(game&&!busy&&!dialog.open){
      if(game.phase==='choose'&&'mudCard' in d)walk(game.select(Number(d.mudCard)));
      else if(game.phase==='choose'&&'mudDraw' in d){game.draw(game.participant(),3);turnEnd();}
      else if(game.phase==='joker'&&'mudSteps' in d)walk(game.move(Number(d.mudSteps)));
      else if(game.phase==='barn'&&'mudDive' in d)dive();
      else if(game.phase==='swap'&&'mudSwap' in d){game.swap(Number(d.mudSwap));land();}
    }
  });
  setup();
}
