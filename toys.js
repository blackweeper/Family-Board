const toysUnits = [
  { id:'robot', name:'Bip le robot' },
  { id:'dino', name:'Turbo le dino' },
  { id:'rabbit', name:'Lune le lapin' },
  { id:'lion', name:'Milo le lion' },
  { id:'hamster', name:'Pistache le pilote' },
  { id:'penguin', name:'Givre le manchot' },
  { id:'raccoon', name:'Zig le raton' },
  { id:'fox', name:'Flèche le renard' },
  { id:'octopus', name:'Bulle la pieuvre' },
  { id:'bear', name:'Roc l’ours' },
  { id:'dragon', name:'Braise le dragon' },
  { id:'crab', name:'Pince le pirate' },
];
const toysWorlds = [
  { id:'castle', name:'Château des blocs', extra:[[1,3],[8,10]], blocked:[[3,4],[7,8]] },
  { id:'jungle', name:'Jungle des cabanes', extra:[[0,4],[4,8],[3,7],[7,11]], blocked:[[1,4],[7,10],[4,5],[6,7]] },
  { id:'space', name:'Station des fusées', extra:[[2,4],[4,6],[5,7],[7,9]], blocked:[[3,4],[7,8],[4,7]] },
  { id:'pirate', name:'Lagon des pirates', extra:[[0,4],[7,11],[4,8],[3,7]], blocked:[[0,1],[10,11],[3,6],[5,8]] },
  { id:'snow', name:'Train des neiges', extra:[[2,4],[7,9],[0,4],[8,10]], blocked:[[0,3],[8,11],[4,7]] },
  { id:'volcano', name:'Île du volcan', extra:[[0,4],[4,8],[3,7],[7,11]], blocked:[[3,4],[4,7],[7,8]] },
  { id:'candy', name:'Village des bonbons', extra:[[2,4],[4,6],[5,7],[7,9]], blocked:[[0,3],[5,8],[7,10]] },
  { id:'reef', name:'Récif des sous-marins', extra:[[0,4],[3,7],[4,8],[7,11]], blocked:[[0,1],[4,5],[6,9],[10,11]] },
];
const toysRanks = toysUnits.length/2;
const toysTeams = ['Bleus','Rouges'];
const toysSites = Array.from({length:12},(_,i)=>[22+i%3*28,25+Math.floor(i/3)*16.67]);
toysSites.push([50,91],[50,9]);
const toysHome = player => 12+player;

function toysLinks(world) {
  const links = [[12,9],[12,10],[12,11],[13,0],[13,1],[13,2]];
  for (let i=0;i<12;i++){
    if (i%3<2) links.push([i,i+1]);
    if (i<9) links.push([i,i+3]);
  }
  return links.filter(([a,b])=>!world.blocked.some(([c,d])=>a===c&&b===d)).concat(world.extra);
}

function toysPortrait(player,unit) {
  return '<img src="./covers/toys-'+toysUnits[player*toysRanks+unit].id+'.png" alt="" draggable="false">';
}

function toysCard(player,unit) {
  return '<span class="toys-card" data-team="'+player+'">'+toysPortrait(player,unit)+
    '<span class="toys-rank" aria-hidden="true">'+(unit+1)+'</span>'+
    (unit<2 ? '<span class="toys-power" aria-hidden="true">'+(unit===0?'▤':'↟')+'</span>':'')+'</span>';
}

const toysRules = '<h2>Comment jouer ?</h2><ol>'+
  '<li>Installez-vous face à face. À ton tour, touche la pile pour piocher deux cartes, ou touche un jouet puis une case accessible.</li>'+
  '<li>Suis les chemins dessinés sur le terrain. Les cartes reliées à leur quartier général brillent. Pour reprendre une case, utilise un jouet dont le nombre est au moins aussi grand.</li>'+
  '<li>Les jouets de force 1 donnent une carte. Ceux de force 2 peuvent sauter une case pour se poser sur une case vide. Les autres jouets ont une force de 3 à 6.</li>'+
  '<li>Atteins le quartier général adverse par un chemin relié au tien pour gagner. Si les deux équipes sont bloquées, la partie est nulle.</li></ol>'+
  '<div class="toys-guide">'+toysUnits.map((unit,id)=>'<div>'+toysCard(Math.floor(id/toysRanks),id%toysRanks)+'<strong>'+unit.name+'</strong></div>').join('')+'</div>';

function toysDeck() {
  const deck = Array.from({length:24},(_,i)=>i%toysRanks);
  for(let i=deck.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  return deck;
}

function toysGame() {
  const soundtrack = familyMusic();
  let world=0, turn=0, phase='setup', chosen=-1, pieces=[], hands=[], decks=[], links=[], adjacency=[];
  let fresh=-1, added=0, passes=0, timer, audio, muted=false, message='';
  const map=()=>toysWorlds[world];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const handLimit=6;

  app.innerHTML='<section class="toys"><div class="toys-bar">'+
    '<button class="secondary" id="back">← Jeux</button><button class="secondary" id="toys-sound" aria-pressed="true">🔊 Son</button>'+
    '<button class="secondary" id="toys-rules">? Règles</button></div><div id="toys-stage"></div>'+
    '<dialog class="toys-rules" aria-label="Règles du Duel des jouets">'+toysRules+
    '<form method="dialog"><button class="toys-action">Compris !</button></form></dialog></section>';
  const stage=app.querySelector('#toys-stage');
  const rules=app.querySelector('.toys-rules');
  const rulesButton=app.querySelector('#toys-rules');
  const focus=selector=>stage.querySelector(selector)?.focus({preventScroll:true});

  function sound(pitches) {
    if(muted||!window.AudioContext) return;
    audio ??= new AudioContext();
    audio.resume().catch(()=>{});
    pitches.forEach((pitch,i)=>{
      const start=audio.currentTime+.075*i;
      const tone=audio.createOscillator(),gain=audio.createGain();
      tone.frequency.value=pitch;
      gain.gain.setValueAtTime(.001,start);
      gain.gain.exponentialRampToValueAtTime(.09,start+.02);
      gain.gain.exponentialRampToValueAtTime(.001,start+.23);
      tone.connect(gain).connect(audio.destination);
      tone.start(start);
      tone.stop(start+.24);
    });
  }

  function setup() {
    soundtrack.stop();
    phase='setup';
    rulesButton.disabled=false;
    stage.innerHTML='<div class="toys-intro"><h1>Duel des jouets</h1><fieldset><legend>Choisis ton terrain</legend><div class="toys-worlds">'+
      toysWorlds.map((item,i)=>'<button data-world="'+i+'" aria-label="'+item.name+'" aria-pressed="'+(world===i)+'"><img src="./covers/toys-'+item.id+'.jpg" alt=""><span>'+item.name+'</span></button>').join('')+
      '</div></fieldset><button class="toys-action" data-start aria-label="Jouer">▶</button></div>';
  }

  function start() {
    soundtrack.start(map().id);
    turn=0;
    phase='pick';
    chosen=-1;
    pieces=Array(toysSites.length).fill(null);
    links=toysLinks(map());
    adjacency=toysSites.map(()=>[]);
    for(const [a,b] of links){
      adjacency[a].push(b);
      adjacency[b].push(a);
    }
    decks=[toysDeck(),toysDeck()];
    hands=decks.map(deck=>[0,1,2,deck.pop()]);
    fresh=-1;
    added=0;
    passes=0;
    message='';
    render();
    sound([392,523,659]);
    focus('.toys-seat.current [data-hand]:enabled');
  }

  function reach(player) {
    const connected=new Set([toysHome(player)]);
    for(const id of connected){
      for(const next of adjacency[id]){
        if(pieces[next]?.player===player) connected.add(next);
      }
    }
    return connected;
  }

  function legal(unit,connected) {
    const border=new Set([...connected].flatMap(id=>adjacency[id]));
    const options=new Set([...border].filter(id=>id!==toysHome(turn)&&
      (!pieces[id]||(pieces[id].player!==turn&&unit>=pieces[id].unit))));
    if(unit===1){
      for(const adjacent of border){
        for(const id of adjacency[adjacent]){
          if(id<12&&!pieces[id]) options.add(id);
        }
      }
    }
    return options;
  }

  function canDraw(player) {
    return hands[player].length<=handLimit-2&&decks[player].length>=2;
  }

  function playerArea(player,available) {
    const current=player===turn;
    const active=current&&phase==='pick';
    const position=player===0?'south':'north';
    return '<div class="toys-seat '+position+(current?' current':'')+'" data-team="'+player+'" aria-label="Équipe '+toysTeams[player]+'">'+
      '<div class="toys-hand">'+hands[player].map((unit,i)=>{
        const arrival=current&&added&&i>=hands[player].length-added;
        return '<button class="toys-unit'+(arrival?' arriving':'')+'" data-hand="'+i+'" data-unit="'+unit+
          '" aria-label="'+toysUnits[player*toysRanks+unit].name+', force '+(unit+1)+'" aria-pressed="'+(current&&chosen===i)+
          '" '+(active&&available[unit].size?'':'disabled')+'>'+toysCard(player,unit)+'</button>';
      }).join('')+'</div>'+
      '<button class="toys-draw" data-draw="'+player+'" '+(active&&canDraw(player)?'':'disabled')+' aria-label="Piocher deux cartes">'+
      '<span class="toys-deck" aria-hidden="true"><i></i><i></i><b>+2</b></span></button></div>';
  }

  function render() {
    rulesButton.disabled=phase==='result';
    const connected=[reach(0),reach(1)];
    const available=Array.from({length:toysRanks},(_,unit)=>legal(unit,connected[turn]));
    const targets=chosen===-1?new Set():available[hands[turn][chosen]];
    stage.innerHTML='<div class="toys-board" data-world="'+map().id+'" data-turn="'+turn+'">'+playerArea(1,available)+
      '<div class="toys-arena"><img class="toys-map" src="./covers/toys-'+map().id+'.jpg" alt="" draggable="false">'+
      toysSites.map(([x,y],i)=>{
        const piece=pieces[i];
        const label=i>=12?'Quartier général '+toysTeams[i-12]:'Case '+(i+1);
        return '<button class="toys-site'+(i>=12?' base':'')+(fresh===i?' fresh':'')+(piece&&connected[piece.player].has(i)?' linked':'')+'" style="--x:'+x+'%;--y:'+y+
          '%" data-site="'+i+'" aria-label="'+label+(piece?', '+toysUnits[piece.player*toysRanks+piece.unit].name+', force '+(piece.unit+1):'')+
          '" '+(phase==='pick'&&targets.has(i)?'':'disabled')+'>'+(piece?toysCard(piece.player,piece.unit):'')+'</button>';
      }).join('')+'</div>'+playerArea(0,available)+
      '<span class="toys-sr" role="status">'+(message||(chosen===-1?'Au tour des '+toysTeams[turn]:'Touche une case accessible'))+'</span></div>';
  }

  function place(site) {
    if(chosen===-1||!legal(hands[turn][chosen],reach(turn)).has(site)) return;
    const [unit]=hands[turn].splice(chosen,1);
    const captured=Boolean(pieces[site]);
    pieces[site]={unit,player:turn};
    if(unit===0&&decks[turn].length){
      hands[turn].push(decks[turn].pop());
      added=1;
    }
    fresh=site;
    passes=0;
    sound(captured?[330,523,659]:[440,659]);
    endTurn(site===toysHome(1-turn));
  }

  function endTurn(won=false) {
    chosen=-1;
    phase='result';
    render();
    timer=setTimeout(()=>{
      if(won){
        finish(turn);
        return;
      }
      turn=1-turn;
      const connected=reach(turn);
      if(!canDraw(turn)&&!hands[turn].some(unit=>legal(unit,connected).size)){
        passes++;
        if(passes===2){
          finish(-1);
          return;
        }
        message='Les '+toysTeams[turn]+' passent leur tour.';
        fresh=-1;
        added=0;
        endTurn();
        return;
      }
      phase='pick';
      fresh=-1;
      added=0;
      message='';
      render();
      focus('.toys-seat.current [data-hand]:enabled, .toys-seat.current [data-draw]:enabled');
    },reduced.matches?160:720);
  }

  function finish(winner) {
    soundtrack.stop();
    phase='finished';
    rulesButton.disabled=false;
    const art=winner===-1?[toysPortrait(0,5),toysPortrait(1,5)]:Array.from({length:toysRanks},(_,unit)=>toysPortrait(winner,unit));
    stage.innerHTML='<div class="toys-finish"><div class="toys-winners">'+art.join('')+'</div><h1>'+
      (winner===-1?'Égalité !':'Les '+toysTeams[winner]+' gagnent !')+'</h1><div class="toys-end-actions">'+
      '<button class="toys-action" data-start aria-label="Rejouer">↻</button><button class="secondary" data-setup>Changer de terrain</button></div></div>';
    sound([523,659,784,1047]);
    focus('[data-start]');
  }

  stage.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button||button.disabled||rules.open) return;
    if(button.hasAttribute('data-world')){
      world=Number(button.dataset.world);
      setup();
      focus('[data-world="'+world+'"]');
    } else if(button.hasAttribute('data-start')) start();
    else if(button.hasAttribute('data-setup')){
      setup();
      focus('[data-world="'+world+'"]');
    } else if(phase==='pick'){
      if(button.hasAttribute('data-hand')){
        const id=Number(button.dataset.hand);
        chosen=chosen===id?-1:id;
        render();
        focus('.toys-seat.current [data-hand="'+id+'"]');
      } else if(button.hasAttribute('data-site')) place(Number(button.dataset.site));
      else if(button.hasAttribute('data-draw')&&canDraw(turn)){
        hands[turn].push(decks[turn].pop(),decks[turn].pop());
        passes=0;
        added=2;
        message='Deux nouveaux jouets !';
        sound([440,523,659]);
        endTurn();
      }
    }
  });
  rulesButton.onclick=()=>rules.showModal();
  app.querySelector('#toys-sound').onclick=event=>{
    muted=!muted;
    soundtrack.mute(muted);
    if(muted) audio?.suspend().catch(()=>{});
    else audio?.resume().catch(()=>{});
    event.currentTarget.textContent=muted?'🔇 Son':'🔊 Son';
    event.currentTarget.setAttribute('aria-pressed',!muted);
  };
  app.querySelector('#back').onclick=()=>{
    clearTimeout(timer);
    soundtrack.close();
    audio?.close().catch(()=>{});
    home('[data-detail="toys"]');
  };
  setup();
}
