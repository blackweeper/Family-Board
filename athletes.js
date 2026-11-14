const athleteRules = '<h2>Comment jouer ?</h2><ol>'+
  '<li>Recrute quatre athlètes à tour de rôle, ou pioche-les au hasard pour une première partie. À deux, ou à trois en mode double, recrute huit athlètes.</li>'+
  '<li>Choisis secrètement un athlète pour chaque course, ou deux en mode double. Chaque athlète ne court qu’une fois.</li>'+
  '<li>Lance ton dé. En piste Galère, ★ rapporte un bronze, ! fait trébucher et les flèches font avancer ou reculer. Un athlète à terre se relève à la place de son prochain déplacement principal.</li>'+
  '<li>Deux places terminent la course. Les points d’or, d’argent et de bronze s’additionnent sur les quatre courses. Le plus haut total gagne et les ex æquo partagent la victoire.</li></ol>'+
  '<p>Jeu de Takashi Ishida et Richard Garfield, édité par CMYK et IELLO. Adaptation numérique non officielle.</p>'+
  '<p><a href="https://iello.fr/wp-content/uploads/2026/02/Magical-Athlete_Rulebook_FR_Light.pdf" target="_blank" rel="noopener">Livret officiel d’IELLO</a> · '+
  '<a href="https://iello.fr/athletes-de-compete-tatillon-repond-a-vos-questions/" target="_blank" rel="noopener">Précisions sur les pouvoirs</a></p>';

const athletePlayerColors=['#fe8765','#8ee8e1','#eac0ff','#ffe477','#9df28a','#ff9ac0'];
const athleteDice=['⚀','⚁','⚂','⚃','⚄','⚅'];
const athleteTrackNames=['Pépère','Galère'];
const athleteArt=id=>'<img class="athlete-art" src="./covers/athlete-'+athleteById[id].image+'.webp" alt="" draggable="false">';

function athleteShuffle(items) {
  const result=[...items];
  for(let i=result.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}

function athleteSnake(players,start,rounds) {
  const forward=Array.from({length:players},(_,i)=>(i+start)%players);
  return Array.from({length:rounds},(_,index)=>index%2===0?forward:[...forward].reverse()).flat();
}

function athleteGame() {
  let count=4, mode='draft', layout='alternating', phase='setup', course=0, first=0;
  let hands, points, reserve, previous, selected, choosing, draft, pool, draftRound, race, flow, decision, last, bronze;
  let timer, audio, muted=false;
  const schedule=[false,true,false,true];
  const roll=()=>1+Math.floor(Math.random()*6);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const dual=()=>count===2||mode==='double';
  const playerName=player=>'Joueur '+(player+1);
  const indexList=()=>Array.from({length:count},(_,i)=>i);
  const wild=()=>layout==='wild'||(layout==='alternating'&&course%2===1)||(layout==='custom'&&schedule[course]);

  app.innerHTML='<section class="athlete"><div class="athlete-bar"><button class="secondary" id="back">← Jeux</button>'+
    '<button class="secondary" id="athlete-sound" aria-pressed="true">🔊 Son</button>'+
    '<button class="secondary" id="athlete-roster">Cartes</button><button class="secondary" id="athlete-rules">? Règles</button></div>'+
    '<div id="athlete-stage"></div><dialog class="athlete-dialog" id="athlete-info"></dialog>'+
    '</section>';
  const stage=app.querySelector('#athlete-stage');
  const info=app.querySelector('#athlete-info');

  function tone(notes) {
    if(muted||!window.AudioContext) return;
    audio??=new AudioContext();
    audio.resume().catch(()=>{});
    notes.forEach((pitch,i)=>{
      const start=audio.currentTime+i*.08, wave=audio.createOscillator(), gain=audio.createGain();
      wave.type='triangle';
      wave.frequency.value=pitch;
      gain.gain.setValueAtTime(.001,start);
      gain.gain.exponentialRampToValueAtTime(.085,start+.02);
      gain.gain.exponentialRampToValueAtTime(.001,start+.2);
      wave.connect(gain).connect(audio.destination);
      wave.start(start); wave.stop(start+.22);
    });
  }

  function card(id,attributes='') {
    const {name,power}=athleteById[id];
    const tag=attributes?'button':'div';
    return '<'+tag+' class="athlete-card" '+attributes+'>'+athleteArt(id)+'<strong>'+name+'</strong><small>'+power+'</small></'+tag+'>';
  }

  function contestantCard(contestant) {
    const actual=race.powerId(contestant);
    const copied=actual&&actual!==contestant.id?
      '<p>Pouvoir copié · '+athleteById[actual].name+'</p>'+card(actual):'';
    return card(contestant.id)+copied;
  }

  function setup() {
    phase='setup';
    stage.innerHTML='<div class="athlete-intro"><div><h1>Athlètes de<br>Compète</h1><p>Quatre courses · 36 athlètes</p>'+
      '<fieldset><legend>Joueurs</legend><div class="athlete-options">'+[2,3,4,5,6].map(n=>'<button data-count="'+n+'" aria-pressed="'+(n===count)+'">'+n+'</button>').join('')+'</div></fieldset>'+
      (count===2?'':'<fieldset><legend>Recrutement</legend><div class="athlete-options">'+
        (count===3?['draft','random','double']:['draft','random']).map((key,i)=>'<button data-mode="'+key+'" aria-pressed="'+(mode===key)+'">'+['Sélection','Première partie','Doubles athlètes'][i]+'</button>').join('')+'</div></fieldset>')+
      '<fieldset><legend>Programme</legend><div class="athlete-options">'+['alternating','mild','wild','custom'].map((key,i)=>'<button data-layout="'+key+'" aria-pressed="'+(layout===key)+'">'+['Alternance','Pépère','Galère','Au choix'][i]+'</button>').join('')+
      '</div>'+(layout==='custom'?'<div class="athlete-options athlete-schedule">'+schedule.map((isWild,i)=>'<button data-schedule="'+i+'" aria-label="Course '+(i+1)+' · '+athleteTrackNames[Number(isWild)]+'">'+(i+1)+'. '+athleteTrackNames[Number(isWild)]+'</button>').join('')+'</div>':'')+
      '</fieldset><button class="athlete-primary" data-start>▶ Jouer</button></div></div>';
  }

  function tiebreak(players) {
    let candidates=[...players];
    while(candidates.length>1) {
      const dice=candidates.map(()=>roll());
      const best=Math.max(...dice);
      candidates=candidates.filter((_,i)=>dice[i]===best);
    }
    return candidates[0];
  }

  function begin() {
    hands=indexList().map(()=>[]);
    points=indexList().map(()=>0);
    previous=[];
    bronze=43;
    course=0;
    reserve=athleteShuffle(athleteRoster.map(card=>card.id));
    if(mode!=='random'||dual()) first=tiebreak(indexList());
    if(mode==='random'&&!dual()) {
      hands.forEach(hand=>hand.push(...reserve.splice(0,4)));
      beginSelection();
    } else {
      draftRound=0;
      beginDraft();
    }
  }

  function beginDraft() {
    phase='draft';
    const size=count===2?8:count*2;
    pool=reserve.splice(0,size);
    draft=athleteSnake(count,(first+draftRound)%count,count===2?4:2);
    renderDraft();
  }

  function scores(earned=[]) {
    return '<div class="athlete-scores">'+points.map((score,i)=>'<div style="--player:'+athletePlayerColors[i]+'"><i></i>'+playerName(i)+' <strong>'+(score+(earned[i]??0))+'</strong></div>').join('')+'</div>';
  }

  function renderDraft() {
    const player=draft[0];
    stage.innerHTML='<div class="athlete-panel" style="--player:'+athletePlayerColors[player]+'">'+scores()+
      '<h2>Recrutement · '+playerName(player)+'</h2><div class="athlete-cards">'+pool.map(id=>card(id,'data-draft="'+id+'"')).join('')+
      '</div><p>'+hands[player].length+' / '+(dual()?8:4)+' athlètes dans ton équipe</p></div>';
  }

  function pickDraft(id) {
    if(!pool.includes(id)) return;
    hands[draft.shift()].push(id);
    pool=pool.filter(value=>value!==id);
    if(draft.length) renderDraft();
    else if(++draftRound===(count===3&&dual()?4:2)) beginSelection();
    else beginDraft();
  }

  function beginSelection() {
    if(course===0) first=tiebreak(indexList());
    choosing=athleteSnake(count,first,1);
    selected=indexList().map(()=>[]);
    phase='handoff';
    renderSelection();
  }

  function renderSelection() {
    const player=choosing[0], need=dual()?2:1;
    stage.innerHTML='<div class="athlete-panel" style="--player:'+athletePlayerColors[player]+'">'+scores()+
      '<p class="athlete-kicker">Course '+(course+1)+' / 4 · '+athleteTrackNames[Number(wild())]+'</p>'+
      '<h2>'+playerName(player)+(phase==='handoff'?' · À toi':' · '+(need===1?'Choisis ton athlète':'Choisis tes deux athlètes'))+'</h2>'+
      (phase==='handoff'?'<button class="athlete-primary" data-handoff>Voir mon équipe</button>':
        '<div class="athlete-cards">'+hands[player].map(id=>card(id,'data-select="'+id+'" aria-pressed="'+selected[player].includes(id)+'"')).join('')+'</div>'+
        '<button class="athlete-primary" data-confirm '+(selected[player].length===need?'':'disabled')+'>✓ Valider</button>')+'</div>';
  }

  function chooseAthlete(id) {
    const picks=selected[choosing[0]];
    const slot=picks.indexOf(id);
    if(slot>=0) picks.splice(slot,1);
    else if(picks.length<(dual()?2:1)) picks.push(id);
    renderSelection();
    stage.querySelector('[data-select="'+id+'"]')?.focus({preventScroll:true});
  }

  function confirm() {
    if(selected[choosing[0]].length!==(dual()?2:1)) return;
    const player=choosing.shift();
    hands[player]=hands[player].filter(id=>!selected[player].includes(id));
    if(choosing.length) {
      phase='handoff';
      renderSelection();
    } else {
      phase='race';
      race=new AthleteRace(selected.flatMap((cards,player)=>cards.map(id=>({id,player}))),{wild:wild(),first,roll,previous,reserve,bronze,points});
      last=null;
      flow=race.run();
      progress();
    }
  }

  function trackPosition(pos) {
    if(pos<=12) return [4+pos*7.5,20];
    if(pos<15) return [94,20+(pos-12)*20];
    return [94-(pos-15)*6,80];
  }

  function track() {
    const cells=Array.from({length:31},(_,pos)=>{
      const [x,y]=trackPosition(pos);
      const tile=wild()?athleteTiles[pos]:undefined;
      const symbol=tile==='star'?'★':tile==='trip'?'!':typeof tile==='number'?(tile>0?'+':'−')+Math.abs(tile):pos===0?'▶':pos===30?'🏁':pos%5===0?pos:'';
      const participants=race.racers.filter(r=>r.pos===pos&&!r.out);
      return '<div class="athlete-cell" data-pos="'+pos+'" data-tile="'+(tile??'')+'" style="--x:'+x+'%;--y:'+y+'%;--cell:'+pos%5+'">'+
        '<span class="athlete-symbol">'+symbol+'</span><div class="athlete-pawns">'+participants.map(r=>'<button class="athlete-pawn'+(r===race.active?' active':'')+(r.tripped?' trip':'')+'" data-pawn="'+r.seat+
          '" aria-label="'+race.label(r)+', case '+r.pos+'" style="--player:'+athletePlayerColors[r.player]+'">'+athleteArt(r.id)+'</button>').join('')+'</div></div>';
    }).join('');
    return '<div class="athlete-track" data-wild="'+wild()+'"><div class="athlete-track-sign"><span>'+(wild()?'⚡':'✿')+
      '</span><strong>'+athleteTrackNames[Number(wild())]+'</strong></div>'+cells+'</div>';
  }

  function renderRace() {
    stage.innerHTML='<div class="athlete-board">'+scores(race.earned)+'<div class="athlete-race-head"><strong>Course '+(course+1)+' / 4</strong>'+
      '<span>🏆 '+athleteAwards[course][0]+' · 🥈 '+athleteAwards[course][1]+'</span></div>'+track()+
      '<div class="athlete-live"><span class="athlete-die" aria-hidden="true">'+(last?.value?athleteDice[last.value-1]:'⚄')+'</span>'+
      '<p role="status">'+(last?.text??'La course va commencer')+'</p><div class="athlete-actions"></div></div>'+
      '<div class="athlete-paddock">'+race.racers.map(r=>'<button data-pawn="'+r.seat+'" style="--player:'+athletePlayerColors[r.player]+'" class="'+
        (r===race.active?'active ':'')+(r.out?'out':'')+'">'+athleteArt(r.id)+'<span>'+race.label(r)+'</span>'+
        (r.tripped?' <b aria-label="A trébuché">!</b>':'')+'</button>').join('')+'</div></div>';
  }

  function showDecision(event) {
    decision=event;
    const buttons=event.choices.map(([value,label],i)=>{
      const id=typeof value==='string'&&athleteById[value]?value:value?.id;
      const die=label==='Lancer le dé'?'⚄ ':'';
      return '<button '+(value===true&&die?'class="athlete-primary"':'class="secondary"')+' data-answer="'+i+'">'+(id?athleteArt(id):'')+die+label+'</button>';
    }).join('');
    const title='<strong class="athlete-decision-title" style="--player:'+athletePlayerColors[event.player]+'"><span>'+playerName(event.player)+'</span> · '+event.title+'</strong>';
    const actionPanel=stage.querySelector('.athlete-actions');
    actionPanel.innerHTML=title+'<div class="athlete-options">'+buttons+'</div>';
    actionPanel.querySelector('button')?.focus({preventScroll:true});
  }

  function progress(value) {
    decision=null;
    const old=new Map([...stage.querySelectorAll('.athlete-pawn')].map(el=>[el.dataset.pawn,el.getBoundingClientRect()]));
    const step=flow.next(value);
    if(step.done) {
      finishRace();
      return;
    }
    const event=step.value;
    if(event.type!=='ask') last=event;
    renderRace();
    if(event.type==='ask') {
      showDecision(event);
      return;
    }
    if(event.type==='move') {
      for(const el of stage.querySelectorAll('.athlete-pawn')){
        const before=old.get(el.dataset.pawn), after=el.getBoundingClientRect();
        if(!before||!el.animate||reduce.matches) continue;
        const x=before.left-after.left, y=before.top-after.top;
        if(x||y) el.animate([{translate:x+'px '+y+'px',opacity:event.warp?.25:1},{translate:'0 0',opacity:1}],{duration:300,easing:'ease-out'});
      }
    }
    if(event.type==='die') tone([360,490]);
    else if(event.type==='finish'||event.type==='tile') tone([523,659,784]);
    timer=setTimeout(progress,reduce.matches?25:event.type==='move'?330:190);
  }

  function finishRace() {
    phase='results';
    bronze=race.bronze;
    const gains=[...race.earned];
    const awards=athleteAwards[course];
    race.order.forEach((r,i)=>{gains[r.player]+=awards[i];});
    gains.forEach((gain,i)=>{points[i]+=gain;});
    if(race.order.length) previous.push(race.order[0].id);
    let eligible;
    if(dual()){
      eligible=indexList().filter(i=>gains[i]===Math.min(...gains));
    } else if(race.eliminated.length) eligible=[race.eliminated[0].player];
    else {
      const lastPlace=Math.min(...race.racers.map(r=>r.pos));
      eligible=race.racers.filter(r=>r.pos===lastPlace).map(r=>r.player);
    }
    const done=course===3;
    if(!done) first=tiebreak(eligible);
    const winners=indexList().filter(i=>points[i]===Math.max(...points));
    const title=done?(winners.length===1?playerName(winners[0])+' gagne !':'Victoire partagée !'):'Arrivée · course '+(course+1);
    stage.innerHTML='<div class="athlete-panel athlete-results">'+scores()+'<h2>'+title+'</h2>'+
      '<div class="athlete-podium">'+race.order.map((r,i)=>'<div>'+athleteArt(r.id)+'<span>'+(i===0?'🏆':'🥈')+' '+awards[i]+
        '</span><strong>'+race.label(r)+'</strong><small>'+playerName(r.player)+'</small></div>').join('')+'</div>'+
      '<div class="athlete-options">'+(done?'<button class="athlete-primary" data-start>↻ Rejouer</button><button class="secondary" data-setup>Réglages</button>':
        '<button class="athlete-primary" data-next>Course suivante →</button>')+'</div></div>';
    tone([523,659,784,1047]);
  }

  stage.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button||button.disabled) return;
    const d=button.dataset;
    if(d.count||d.mode||d.layout||d.schedule){
      if(d.count) { count=Number(d.count); if(count===2||(mode==='double'&&count!==3)) mode='draft'; }
      if(d.mode) mode=d.mode;
      if(d.layout) layout=d.layout;
      if(d.schedule) schedule[Number(d.schedule)]=!schedule[Number(d.schedule)];
      setup();
    } else if('start' in d) begin();
    else if('setup' in d) setup();
    else if('draft' in d&&phase==='draft') pickDraft(d.draft);
    else if('handoff' in d&&phase==='handoff') {phase='selection';renderSelection();}
    else if('select' in d&&phase==='selection') chooseAthlete(d.select);
    else if('confirm' in d&&phase==='selection') confirm();
    else if('answer' in d&&decision) progress(decision.choices[Number(d.answer)][0]);
    else if('next' in d&&phase==='results') {course++;beginSelection();}
    else if('pawn' in d&&race) showInfo(contestantCard(race.racers[Number(d.pawn)]));
  });

  function showInfo(content) {
    info.innerHTML=content+'<form method="dialog"><button class="athlete-primary">Fermer</button></form>';
    if(!info.open) info.showModal();
  }
  app.querySelector('#athlete-roster').onclick=()=>showInfo('<h2>Les 36 athlètes</h2><div class="athlete-cards">'+athleteRoster.map(x=>card(x.id)).join('')+'</div>');
  app.querySelector('#athlete-rules').onclick=()=>showInfo(athleteRules);
  app.querySelector('#athlete-sound').onclick=event=>{
    muted=!muted;
    event.currentTarget.textContent=muted?'🔇 Son':'🔊 Son';
    event.currentTarget.setAttribute('aria-pressed',!muted);
    if(muted) audio?.suspend().catch(()=>{});
    else audio?.resume().catch(()=>{});
  };
  app.querySelector('#back').onclick=()=>{
    clearTimeout(timer);
    audio?.close().catch(()=>{});
    home('[data-detail="athletes"]');
  };
  setup();
}
