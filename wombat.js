const wombatRules=`<h2>Défendez la tour</h2><ol><li>Le plus jeune commence. Choisis un des quatre chemins pour orienter la tour. Touche Lancer pour faire partir la jauge, puis touche la jauge ou lâche le dé dans la zone dorée pour un lancer puissant.</li><li>Le dé rebondit sur les assaillants. Retirez ceux qui tombent. Un pion seulement bousculé reste en place. S’il ne reste aucun ennemi, la partie est gagnée avant de lire la face du dé.</li><li>La face Renforts ajoute un ou deux soldats, ou un chef qui fait avancer tout son chemin. La face Charge vous laisse choisir un chemin occupé à faire avancer. Sans carte Renforts, une Charge la remplace.</li><li>La face Machine donne un lancer supplémentaire, avec un lanceur, un maillet ou une planche. Applique aussi la face de ce nouveau lancer.</li><li>Chaque assaillant bloqué lors d’un placement ou d’une charge brise un bouclier. Le troisième bouclier brisé fait perdre l’équipe. En mode Héroïque, un deuxième soldat attend sur chaque chemin au départ.</li></ol><p>D’après Wombat Tower, d’Antonin Boccara et Romaric Galonnier, édité par Blue Orange. <a href="https://blueorangegames.eu/wp-content/uploads/2026/04/27-01-2026_Wombat-Tower_Rules-FR_285x195mm_AM-2.pdf" target="_blank" rel="noopener">Livret officiel</a></p>`;
const wombatNames=['Nord','Est','Sud','Ouest'];
const wombatColors=['#b8e8aa','#ffc286','#ffe096','#a2d7f5'];
const wombatArt=(id,extra='')=>`<span class="wb-art ${extra}" aria-hidden="true" style="--sx:${id%4*100/3}%;--sy:${Math.floor(id/4)*100}%"></span>`;
const wombatFace={invaders:['♟','Renforts'],charge:['➜','Charge'],machine:['⚙','Machine']};

function wombatGame() {
  let count=2,first=0,heroic=false,game,lane=2,measuring=false,frame,timer,ticket=0,muted=false,power=0,origin;
  const soundtrack=familyMusic(), effects=partyEffects();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  app.innerHTML=`<section class="party wb"><div class="party-bar"><button class="secondary" id="back">← Jeux</button><button class="secondary" data-wb-sound aria-pressed="true">♪ Son</button><button class="secondary" data-wb-rules>? Règles</button></div><div class="wb-stage"></div><dialog class="party-rules" aria-label="Règles de la Tour des wombats">${wombatRules}<form method="dialog"><button class="party-primary">Fermer</button></form></dialog></section>`;
  const root=app.querySelector('.wb'),stage=root.querySelector('.wb-stage'),dialog=root.querySelector('dialog');
  const focus=selector=>stage.querySelector(selector)?.focus({preventScroll:true});
  const later=(callback,delay)=>{const run=ticket;timer=setTimeout(()=>{if(run===ticket)callback();},reduced.matches?18:delay);};

  function reset(){ticket++;clearTimeout(timer);cancelAnimationFrame(frame);measuring=false;}

  function setup(){
    reset();soundtrack.stop();game=null;
    stage.innerHTML=`<div class="party-intro wb-intro"><h1 class="party-sr">La Tour des wombats</h1><div class="party-config"><fieldset><legend>Défenseurs</legend><div class="party-options">${[1,2,3,4].map(n=>`<button data-wb-count="${n}" aria-pressed="${n===count}">${n}</button>`).join('')}</div></fieldset><fieldset><legend>Défi</legend><div class="party-options"><button data-wb-mode="normal" aria-pressed="${!heroic}">Classique</button><button data-wb-mode="heroic" aria-pressed="${heroic}">⚡ Héroïque</button></div></fieldset>${count>1?`<label>Le plus jeune <select data-wb-first>${Array.from({length:count},(_,i)=>`<option value="${i}" ${i===first?'selected':''}>Joueur ${i+1}</option>`).join('')}</select></label>`:''}<button data-wb-start class="party-primary">▶ Jouer</button></div></div>`;
  }

  function finish(){
    soundtrack.stop();
    stage.innerHTML=`<div class="party-finish wb-finish">${game.won?partyConfetti():''}<div class="party-trophy">${game.won?'🏆':'💔'}</div><h2>${game.won?'La tour est sauvée !':'Les boucliers ont cédé'}</h2><div class="party-champions"><div style="--seat:#b7eaff">${wombatArt(7)}</div></div><div class="party-options"><button class="party-primary" data-wb-start>↻ Rejouer</button><button data-wb-setup>Réglages</button></div></div>`;
    effects.play(game.won?[392,523,659,784,1047]:[392,293,196],muted);
    focus('[data-wb-start]');
  }

  function render(note='',visual={}){
    const launch=game.phase==='aim'&&!visual.roll;
    const charge=game.phase==='charge';
    const hint=note||(charge?'Choisissez un chemin occupé':measuring?'Arrête dans la zone dorée':game.machine!==null?'Oriente la machine puis lance':'Oriente la tour, puis lance');
    const show=visual.before??game.lanes;
    stage.innerHTML=`<div class="wb-table" data-phase="${game.phase}"><header class="wb-hud"><span>${wombatArt(7)}<b>${count===1?'Solo':'Joueur '+(game.turn+1)}</b></span><div class="wb-shields" aria-label="${game.shields} boucliers intacts">${Array.from({length:3},(_,i)=>wombatArt(3,i<game.shields?'':'broken')).join('')}</div><span aria-label="${game.invaders.length} cartes renforts">♟ ${game.invaders.length}</span></header>
      <div class="wb-ground"><div class="wb-arena">${show.map((path,i)=>`<div class="wb-lane" data-lane="${i}" data-selected="${lane===i}" data-tappable="${(launch&&!measuring)||(charge&&path.some(Boolean))}" style="--lane:${wombatColors[i]};--angle:${i*90}deg">${path.map((enemy,j)=>`<span class="wb-cell ${visual.hitLane===i&&visual.hits?.includes(j)?'toppled':visual.hitLane===i&&visual.nudged?.includes(j)?'nudged':''}" data-depth="${j}">${enemy?wombatArt(enemy===3?2:1):''}</span>`).join('')}</div>`).join('')}
      <div class="wb-tower" style="--direction:${(lane-2)*90}deg">${wombatArt(0)}</div>${visual.roll===true?`<i class="wb-rolling" aria-hidden="true" data-machine="${game.machine}" style="--direction:${lane*90}deg">⚄</i>`:''}</div></div>
      <div class="wb-console"><div class="wb-note" role="status" ${visual.face?`data-face="${visual.face}"`:''}>${visual.face?`${wombatFace[visual.face][0]} `:''}${hint}</div>${game.machine===null?'':`<div class="wb-machine">${wombatArt(game.machine+4)}<b>${wombatMachines[game.machine]}</b></div>`}
      <div class="wb-directions" aria-label="Choisir un chemin">${wombatNames.map((name,i)=>`<button data-wb-lane="${i}" aria-label="${name}" aria-pressed="${i===lane}" style="--lane:${wombatColors[i]}" ${(!launch&&!charge)||measuring||(charge&&!game.lanes[i].some(Boolean))?'disabled':''}>${['↑','→','↓','←'][i]}</button>`).join('')}</div>
      ${launch?`<div class="wb-launch"><button class="wb-meter" data-wb-launch aria-label="${measuring?'Arrêter la jauge':'Lancer la jauge'}"><span></span><i></i></button><button class="party-primary" data-wb-launch>${measuring?'◆ Lâcher le dé':'⚄ Lancer'}</button></div>`:''}</div></div>`;
  }

  function start(){
    reset();lane=2;game=new WombatWatch(count,first,heroic);
    soundtrack.start('wombat');render();focus('[data-wb-launch]');
  }

  function beginMeter(){
    measuring=true;power=0;origin=undefined;
    render();focus('.wb-launch .party-primary');
    if(reduced.matches){power=.83;stage.querySelector('.wb-meter').style.setProperty('--power','83%');return;}
    const tick=time=>{
      if(!measuring||!root.isConnected)return;
      if(origin===undefined)origin=time;
      const cycle=((time-origin)/1160)%2;
      power=cycle<1?cycle:2-cycle;
      stage.querySelector('.wb-meter')?.style.setProperty('--power',`${power*100}%`);
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
  }

  function applyFace(face){
    if(game.won!==null){finish();return;}
    const result=game.effect(face);
    if(game.won!==null){finish();return;}
    if(result.type==='charge')render('Choisissez un chemin à faire avancer',{face:'charge'});
    else if(result.type==='machine'){
      render('À vous de rejouer avec la machine',{face:'machine'});
      effects.play([349,523,698,784],muted);
    }else {
      const rank=result.rank===3?'Un chef !':result.rank===2?'Deux soldats !':'Un soldat !';
      render(rank,{face:'invaders'});
      result.lanes.forEach(path=>stage.querySelector(`[data-lane="${path}"]`).classList.add('wb-news'));
      effects.play([392,247],muted);
    }
    focus(result.type==='charge'?'[data-wb-lane]:enabled':'[data-wb-launch]');
  }

  function fire(){
    cancelAnimationFrame(frame);measuring=false;
    const before=game.lanes.map(path=>[...path]);
    const strength=power>=.69&&power<=.91 ? 1 : power*.82;
    const result=game.strike(lane,strength);
    if(!result)return;
    render('Le dé roule !',{before,roll:true});
    effects.play([202,268,314],muted);
    later(()=>{
      const note=result.hits.length?`${result.hits.length} assaillant${result.hits.length>1?'s':''} repoussé${result.hits.length>1?'s':''} !`:result.nudged.length?'Bousculé, mais encore debout !':'Le dé s’arrête !';
      render(note,{before,roll:'impact',hitLane:lane,hits:result.hits,nudged:result.nudged});
      if(result.hits.length)effects.play([330,523,659],muted);
      later(()=>{
        if(game.won!==null){finish();return;}
        render(wombatFace[result.face][1],{face:result.face});
        later(()=>applyFace(result.face),530);
      },480);
    },520);
  }

  root.addEventListener('change',e=>{if(e.target.matches('[data-wb-first]'))first=Number(e.target.value);});
  root.addEventListener('click',e=>{
    const path=e.target.closest('.wb-cell')?.closest('[data-tappable="true"]');
    if(path){
      stage.querySelector(`[data-wb-lane="${path.dataset.lane}"]`)?.click();
      return;
    }
    const button=e.target.closest('button');
    if(!button||button.disabled)return;
    const d=button.dataset;
    if(button.id==='back'){reset();soundtrack.close();effects.close();home('[data-detail="wombat"]');}
    else if('wbSound' in d){muted=!muted;partyMute(button,soundtrack,muted);if(muted)effects.close();}
    else if('wbRules' in d)dialog.showModal();
    else if('wbStart' in d)start();
    else if('wbSetup' in d)setup();
    else if('wbCount' in d||'wbMode' in d){if('wbCount' in d)count=Number(d.wbCount);else heroic=d.wbMode==='heroic';first=Math.min(first,count-1);setup();focus('wbCount' in d?`[data-wb-count="${count}"]`:`[data-wb-mode="${d.wbMode}"]`);}
    else if(game&&!dialog.open){
      if('wbLane' in d){
        lane=Number(d.wbLane);
        if(game.phase==='charge'){
          const shields=game.shields;
          const moved=game.charge(lane);
          if(!moved)return;
          if(game.won!==null){finish();return;}
          render(shields===game.shields?'Les assaillants avancent !':'Un bouclier a cédé !');
          moved.forEach(slot=>stage.querySelector(`[data-lane="${lane}"] [data-depth="${slot}"]`).classList.add('wb-approach'));
          effects.play(shields===game.shields?[310,385]:[275,180,104],muted);
        }else if(game.phase==='aim'&&!measuring){
          const tower=stage.querySelector('.wb-tower');
          if(!reduced.matches&&tower.animate)tower.animate([{rotate:tower.style.getPropertyValue('--direction')},{rotate:`${(lane-2)*90}deg`}],{duration:280});
          tower.style.setProperty('--direction',`${(lane-2)*90}deg`);
          stage.querySelectorAll('[data-wb-lane]').forEach((item,i)=>item.setAttribute('aria-pressed',i===lane));
          stage.querySelectorAll('.wb-lane').forEach((item,i)=>item.dataset.selected=i===lane);
          return;
        }
        focus('[data-wb-launch]');
      }else if('wbLaunch' in d&&game.phase==='aim'){
        if(measuring)fire();else beginMeter();
      }
    }
  });
  setup();
}
