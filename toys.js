const toysUnits = [
  { id:'robot', name:'Bip le robot', power:'Pioche une carte après l’avoir posé.', icon:'▤' },
  { id:'dino', name:'Turbo le dino', power:'Peut sauter une case pour atteindre une base vide.', icon:'↟' },
  { id:'rabbit', name:'Lune le lapin', power:'Ses trois points lui permettent de reprendre une base plus faible.' },
  { id:'lion', name:'Milo le lion', power:'Avec quatre points, c’est le jouet le plus fort.' },
];
const toysWorlds = [
  { id:'castle', name:'Château des blocs', stars:[1,3,4,5,7], extra:[[1,3],[5,7]], blocked:[] },
  { id:'jungle', name:'Jungle des cabanes', stars:[0,2,4,6,8], extra:[[0,4],[4,8]], blocked:[[1,4],[4,7]] },
  { id:'space', name:'Station des étoiles', stars:[1,3,4,5,7], extra:[[2,4],[4,6]], blocked:[[3,4],[4,5]] },
];
const toysTeams = [{name:'Bleus', color:'#8fe5ff'}, {name:'Corails', color:'#ffad8e'}];
const toysSites = Array.from({length:9}, (_,i)=>[20+i%3*30, 27+Math.floor(i/3)*23]);
toysSites.push([50,91],[50,9]);

function toysLinks(world) {
  const links = [[9,6],[9,7],[9,8],[10,0],[10,1],[10,2]];
  for (let i=0; i<9; i++) {
    if (i%3 < 2) links.push([i,i+1]);
    if (i < 6) links.push([i,i+3]);
  }
  return links.filter(([a,b])=>!world.blocked.some(([c,d])=>a===c && b===d)).concat(world.extra);
}

function toysPortrait(id) {
  return '<img src="./covers/toys-'+toysUnits[id].id+'.png" alt="" draggable="false">';
}

function toysCard(id) {
  const unit = toysUnits[id];
  return toysPortrait(id)+'<span class="toys-pips" aria-hidden="true">'+ '●'.repeat(id+1)+'</span>'+
    (unit.icon ? '<span class="toys-power" aria-hidden="true">'+unit.icon+'</span>' : '');
}

function toysDeck() {
  const deck = [0,1,2,0,1,2,3,0,1,2,3,0,1,2,3];
  for(let i=deck.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  return deck;
}

function toysGame() {
  let world = 0;
  let turn = 0;
  let phase = 'setup';
  let chosen = -1;
  let pieces = [];
  let hands = [];
  let decks = [];
  let stars = [];
  let fresh = -1;
  let passes = 0;
  let timer;
  let audio;
  let muted = false;
  let message = '';
  const starGoal = 3;
  const other = () => 1-turn;
  const team = i => toysTeams[i].name;
  const map = () => toysWorlds[world];
  const neighbors = (id) => toysLinks(map()).flatMap(([a,b])=>a===id ? [b] : b===id ? [a] : []);

  app.innerHTML = '<section class="toys"><div class="toys-bar">'+
    '<button class="secondary" id="back">← Jeux</button>'+
    '<button class="secondary" id="toys-sound" aria-pressed="true">🔊 Son</button>'+
    '<button class="secondary" id="toys-rules">? Règles</button></div><div id="toys-stage"></div>'+
    '<dialog class="toys-rules" aria-label="Règles du Duel des jouets"><h2>Comment jouer ?</h2><ol>'+
    '<li>Installez-vous face à face. À ton tour, pioche jusqu’à deux jouets ou choisis un jouet de ta main, puis une base qui s’allume.</li>'+
    '<li>Suis les chemins qui partent de ta cabane en passant par tes jouets. Pour prendre une base adverse, pose un jouet avec au moins autant de points que celui qui l’occupe.</li>'+
    '<li>Une base marquée d’une étoile te rapporte une étoile la première fois que tu la prends.</li>'+
    '<li>Gagne avec trois étoiles ou en atteignant la cabane adverse. Si les deux équipes ne peuvent plus jouer, le plus d’étoiles l’emporte.</li></ol>'+
    '<div class="toys-guide">'+toysUnits.map((unit,i)=>'<div class="toys-guide-card">'+toysCard(i)+'<div><strong>'+unit.name+'</strong><p>'+unit.power+'</p></div></div>').join('')+'</div>'+
    '<form method="dialog"><button class="toys-action">Compris !</button></form></dialog></section>';
  const stage = app.querySelector('#toys-stage');
  const rules = app.querySelector('.toys-rules');
  const rulesButton = app.querySelector('#toys-rules');
  const focus = selector => stage.querySelector(selector)?.focus({preventScroll:true});

  function sound(pitches) {
    if (muted || !window.AudioContext) return;
    audio ??= new AudioContext();
    audio.resume().catch(()=>{});
    pitches.forEach((pitch,i)=>{
      const start = audio.currentTime + .09*i;
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.frequency.value = pitch;
      gain.gain.setValueAtTime(.001,start);
      gain.gain.exponentialRampToValueAtTime(.10,start+.023);
      gain.gain.exponentialRampToValueAtTime(.001,start+.25);
      tone.connect(gain).connect(audio.destination);
      tone.start(start);
      tone.stop(start+.26);
    });
  }

  function setup() {
    phase = 'setup';
    rulesButton.disabled = false;
    stage.innerHTML = '<div class="toys-intro"><div class="toys-intro-copy"><h1>Duel<br>des jouets</h1>'+
      '<p>2 joueurs · Dès 5 ans</p><fieldset><legend>Choisis ton terrain</legend><div class="toys-worlds">'+
      toysWorlds.map((item,i)=>'<button data-world="'+i+'" aria-pressed="'+(world===i)+'"><img src="./covers/toys-'+item.id+'.jpg" alt=""><span>'+item.name+'</span></button>').join('')+
      '</div></fieldset><button class="toys-action" data-start>▶ Jouer</button></div></div>';
  }

  function start() {
    turn=0;
    phase='pick';
    chosen=-1;
    pieces=Array(11).fill(null);
    decks=[toysDeck(),toysDeck()];
    hands=decks.map(deck=>[0,1,2,deck.pop()]);
    stars=[new Set(),new Set()];
    fresh=-1;
    passes=0;
    message='';
    render();
    sound([392,523,659]);
  }

  function reach(player) {
    const connected = new Set([9+player]);
    for(const id of connected) {
      for(const next of neighbors(id)){
        if (pieces[next]?.player === player) connected.add(next);
      }
    }
    return connected;
  }

  function legal(unit) {
    const connected = reach(turn);
    const border = new Set([...connected].flatMap(neighbors));
    const options = [...border].filter(id=>id!==9+turn &&
      (id===9+other() || !pieces[id] || (pieces[id].player!==turn && unit>=pieces[id].unit)));
    if(unit===1){
      for(const adjacent of border){
        for(const id of neighbors(adjacent)){
          if(id<9 && !pieces[id] && !options.includes(id)) options.push(id);
        }
      }
    }
    return options;
  }

  function canDraw(player) {
    return hands[player].length<5 && decks[player].length>0;
  }

  function playerArea(player) {
    const isActive = player===turn;
    const active = isActive && phase==='pick';
    const position = player===0 ? 'south' : 'north';
    return '<div class="toys-seat '+position+' '+(isActive?'current':'')+'" style="--team:'+toysTeams[player].color+'" aria-label="Équipe '+team(player)+'">'+
      '<div class="toys-score" aria-label="'+stars[player].size+' étoiles sur '+starGoal+'">'+
      Array.from({length:starGoal},(_,i)=>'<span class="'+(i<stars[player].size?'earned':'')+'" aria-hidden="true">★</span>').join('')+'</div>'+
      '<div class="toys-hand">'+hands[player].map((unit,i)=>'<button class="toys-unit unit-'+unit+'" data-hand="'+i+'" aria-label="'+toysUnits[unit].name+', '+(unit+1)+' points" aria-pressed="'+(isActive&&chosen===i)+'" '+(active&&legal(unit).length?'':'disabled')+'>'+toysCard(unit)+'</button>').join('')+'</div>'+
      '<button class="toys-draw" data-draw="'+player+'" '+(active&&canDraw(player)?'':'disabled')+' aria-label="Piocher">'+
      '<span aria-hidden="true">▤</span> Pioche</button></div>';
  }

  function render() {
    rulesButton.disabled = phase==='result';
    const targets = chosen===-1 ? [] : legal(hands[turn][chosen]);
    const connected=reach(turn);
    const paths=toysLinks(map()).map(([a,b])=>{
      const [x1,y1]=toysSites[a], [x2,y2]=toysSites[b];
      const pathClass=connected.has(a)&&connected.has(b) ? 'linked' : '';
      return '<line class="'+pathClass+'" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'"></line>';
    }).join('');
    stage.innerHTML = '<div class="toys-board" style="--active-team:'+toysTeams[turn].color+'" data-world="'+map().id+'" data-turn="'+turn+'">'+playerArea(1)+
      '<div class="toys-arena"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+paths+'</svg>'+
      toysSites.map(([x,y],i)=>{
        const piece=pieces[i];
        const base=i>=9;
        const star=map().stars.includes(i);
        const tint=piece ? toysTeams[piece.player].color : base ? toysTeams[i-9].color : '#f6e2ab';
        const label=base ? 'Cabane '+team(i-9) : 'Base '+(i+1)+(star?', étoile':'')+(piece?', '+toysUnits[piece.unit].name+', '+(piece.unit+1)+' points, '+team(piece.player):'');
        return '<button class="toys-site '+(base?'base ':'')+(piece?'occupied ':'')+(star?'star ':'')+(fresh===i?'fresh ':'')+
          '" style="--x:'+x+'%;--y:'+y+'%;--team:'+tint+'" data-site="'+i+'" aria-label="'+label+'" '+(phase==='pick'&&targets.includes(i)?'':'disabled')+'>'+
          (piece ? toysCard(piece.unit) : base ? '<span aria-hidden="true">⌂</span>' : star ? '<span aria-hidden="true">★</span>' : '')+
          (piece&&star?'<span class="toys-star-mark" aria-hidden="true">★</span>':'')+'</button>';
      }).join('')+
      '<div class="toys-turn" style="--team:'+toysTeams[turn].color+'" role="status">'+
      (message || (chosen===-1 ? 'Au tour des '+team(turn) : 'Touche une base allumée'))+'</div></div>'+playerArea(0)+'</div>';
  }

  function drawCards(amount) {
    while(amount-- > 0 && canDraw(turn)) hands[turn].push(decks[turn].pop());
  }

  function place(site) {
    if(chosen===-1 || !legal(hands[turn][chosen]).includes(site)) return;
    const [unit]=hands[turn].splice(chosen,1);
    pieces[site]={unit,player:turn};
    const newStar=map().stars.includes(site)&&!stars[turn].has(site);
    if(newStar) stars[turn].add(site);
    if(unit===0) drawCards(1);
    fresh=site;
    passes=0;
    sound(newStar?[523,659,784,1047]:[440,659]);
    const victory=site===9+other() ? 'Cabane conquise !' : stars[turn].size===starGoal ? 'Trois étoiles !' : '';
    endTurn(newStar?'★ Une étoile !':'',victory);
  }

  function endTurn(text,victory='') {
    chosen=-1;
    phase='result';
    message=text;
    render();
    timer=setTimeout(()=>{
      if(victory) return finish(turn,victory);
      turn=other();
      if(!canDraw(turn)&&!hands[turn].some(unit=>legal(unit).length)){
        passes++;
        if(passes===2) return finish(stars[0].size===stars[1].size?-1:Number(stars[1].size>stars[0].size),'Dernier tour !');
        endTurn('Les '+team(turn)+' passent leur tour.');
        return;
      }
      phase='pick';
      fresh=-1;
      message='';
      render();
      focus('[data-hand]:enabled, [data-draw]:enabled');
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 180 : 720);
  }

  function finish(winner,reason) {
    phase='finished';
    rulesButton.disabled=false;
    const art=winner===-1 ? [0,1,2,3] : [winner,2+winner];
    stage.innerHTML='<div class="toys-finish"><div class="toys-winners">'+art.map(toysPortrait).join('')+'</div>'+
      '<h1>'+(winner===-1?'Égalité !':'Les '+team(winner)+' gagnent !')+'</h1><p>'+reason+'</p>'+
      '<div class="toys-end-actions"><button class="toys-action" data-start>↻ Rejouer</button><button class="secondary" data-setup>Changer de terrain</button></div></div>';
    sound([523,659,784,1047]);
    focus('[data-start]');
  }

  stage.addEventListener('click', event=>{
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
      else if(button.hasAttribute('data-draw')){
        drawCards(2);
        passes=0;
        sound([440,523]);
        endTurn('De nouveaux jouets !');
      }
    }
  });
  rulesButton.onclick=()=>rules.showModal();
  app.querySelector('#toys-sound').onclick=event=>{
    muted=!muted;
    if(muted) audio?.suspend().catch(()=>{});
    else audio?.resume().catch(()=>{});
    event.currentTarget.textContent=muted?'🔇 Son':'🔊 Son';
    event.currentTarget.setAttribute('aria-pressed',!muted);
  };
  app.querySelector('#back').onclick=()=>{
    clearTimeout(timer);
    audio?.close().catch(()=>{});
    home('[data-detail="toys"]');
  };
  setup();
}

