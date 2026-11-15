const mistRules='<h2>Les Brumes du Kakapo</h2><ol><li>Gardez vos mains secrètes. À chaque pli, suivez la couleur de la première carte si vous l’avez. La carte la plus forte de cette couleur gagne, sauf si un atout est joué. La carte gagnante fixe le prochain atout et la tuile à poser.</li><li>Tournez ou retournez la tuile, puis placez-la sans couvrir une autre tuile. Entourez les sanctuaires par les côtés en respectant les couleurs marquées. Vous avez sept plis. Une réussite en cinq plis ou moins donne une étoile.</li><li>À deux, le leader joue aussi pour l’automa. S’il peut suivre avec une carte visible, il doit le faire. Sinon, il peut jouer une carte visible ou piocher à l’aveugle.</li><li>Les tourbillons font défausser une carte à chacun. La brume peut imposer la prochaine couleur d’ouverture. Les missions de nuit exigent de dégager les cases spéciales adjacentes.</li><li>Chaque tentative fait avancer la Lune. Réussis les deux missions d’entraînement pour ouvrir la carte. La campagne compte 22 scénarios, dont les deux entraînements du livret. Les suivants ont été recréés pour Family Board.</li></ol><p>D’après Yami, de Hiroki Ohba, Ryoji Suzuki, Hikaru Tezuka et Anthony Perone, édité par Musoka. <a href="https://musokastudio.com/fr/pages/regles-yami" target="_blank" rel="noopener">Règles de l’éditeur</a></p>';
const mistSaveKey='family-board-kakapo';
const mistEmpty=()=>({attempts:0,cleared:[],stars:[]});

function mistGame(){
  const ui=tripShell('mist','Les Brumes du Kakapo',mistRules);
  const art=(id,extra='')=>tripArt('mist',id,extra);
  let count=2,index=0,record=mistEmpty(),game,privateOpen=false,rotation=0,mirror=false,anchor=-1,moving=-1,choosing=false,last=[],busy=false,logged=false;
  try{
    const data=JSON.parse(localStorage.getItem(mistSaveKey));
    if(Number.isInteger(data?.attempts)&&data.attempts>=0&&Array.isArray(data.cleared)&&Array.isArray(data.stars)){
      record={attempts:Math.min(22,data.attempts),cleared:data.cleared.filter(i=>Number.isInteger(i)&&i>=0&&i<22),stars:data.stars.filter(i=>Number.isInteger(i)&&i>=0&&i<22)};
    }
  }catch{}

  const available=i=>i===0||i===1&&record.cleared.includes(0)||record.cleared.includes(0)&&record.cleared.includes(1);
  const seatName=i=>i===2&&count===2?'Automa':'Joueur '+(i+1);
  const badge=i=>'<span class="mist-tone" style="--tone:'+mistTone[i]+'" aria-hidden="true">'+mistSymbols[i]+'</span>';

  function setup(){
    ui.cancel();ui.music.stop();
    ui.stage.innerHTML='<div class="party-intro"><h1 class="party-sr">Les Brumes du Kakapo</h1><div class="party-config trip-setup">'+tripPlayers(count,4)+'<button class="party-primary" data-mist-map>✦ Carte du royaume</button></div></div>';
  }

  function world(){
    ui.cancel();ui.music.stop();
    const ended=record.attempts>=22,won=record.cleared.includes(21);
    ui.stage.innerHTML='<div class="trip-table mist-world"><header class="trip-hud"><b>Carte du royaume</b><strong>'+(won?'Le royaume est sauvé !':ended?'La Lune a recouvert le royaume':'Choisis une mission')+'</strong><span>☾ '+record.attempts+'/22</span></header>'+
      '<div class="mist-missions">'+mistScenarios.map(([name,land],i)=>'<button data-mist-mission="'+i+'" data-land="'+land+'" '+(available(i)&&!ended?'':'disabled')+'>'+
      '<b>'+String(i+1).padStart(2,'0')+'</b>'+art(i===21?5:land==='water'?2:land==='mist'?3:0)+'<span>'+name+'</span>'+
      (record.stars.includes(i)?'<small aria-label="Étoile remportée">★</small>':record.cleared.includes(i)?'<small aria-label="Réussie">✓</small>':'')+'</button>').join('')+'</div>'+
      '<div class="party-options"><button data-trip-setup>Réglages</button>'+(ended?'<button data-mist-reset>↻ Nouvelle campagne</button>':'')+'</div></div>';
    ui.focus('[data-mist-mission]:enabled, [data-mist-reset]');
  }

  function start(){
    ui.cancel();game=new MistJourney(count,index,record);privateOpen=false;busy=false;logged=false;resetTile();last=[];
    ui.music.start(game.mission.land==='water'?'mist-water':'mist');render();focus();
  }

  function resetTile(){rotation=0;mirror=false;anchor=-1;moving=-1;choosing=false;}
  function focus(){ui.focus('.mist-private button:enabled, .mist-panel button:enabled');}

  function mini(shape){
    return '<span class="mist-mini" aria-hidden="true">'+shape.map(([x,y])=>'<i style="grid-area:'+(y+1)+'/'+(x+1)+'"></i>').join('')+'</span>';
  }

  function cardFace(card){
    return '<b>'+card.rank+'</b>'+art(card.color)+mini(mistShape(card))+'<span aria-hidden="true">'+mistSymbols[card.color]+'</span>';
  }

  function cardButton(card,mode,enabled=true){
    return '<button class="mist-card" data-mist-'+mode+'="'+card.id+'" style="--tone:'+mistTone[card.color]+'" '+(enabled?'':'disabled')+' aria-label="'+card.rank+', '+mistNames[card.color]+'">'+cardFace(card)+'</button>';
  }

  function finish(){
    if(!logged){
      logged=true;record.attempts=Math.min(22,record.attempts+1);
      if(game.won&&!record.cleared.includes(index))record.cleared.push(index);
      if(game.won&&game.round<=5&&!record.stars.includes(index))record.stars.push(index);
      try{localStorage.setItem(mistSaveKey,JSON.stringify(record));}catch{}
    }
    ui.music.stop();
    const title=game.won?(index===21?'Le Kakapo a sauvé son royaume !':'Sanctuaires libérés !'):'La brume tient encore';
    ui.stage.innerHTML='<div class="party-finish">'+(game.won?partyConfetti():'')+'<h2>'+title+'</h2><div class="trip-winners">'+art(game.won?5:7)+'</div>'+
      '<strong>'+game.round+' / 7 plis · '+game.missing()+' cases à couvrir</strong><div class="party-options"><button class="party-primary" data-mist-map>✦ Retour à la carte</button>'+
      (record.attempts<22?'<button data-mist-mission="'+index+'">↻ Rejouer la mission</button>':'')+'</div></div>';
    ui.sound(game.won?[392,523,659,784,1047]:[372,293,220]);ui.focus('[data-mist-map]');
  }

  function secret(){
    const discard=game.phase==='discard';
    const seat=discard?game.discardOrder[0]:game.turn;
    if(!privateOpen)return '<div class="mist-private">'+art(5)+'<b>Passe l’écran à '+seatName(seat)+'</b><button class="party-primary" data-mist-secret>👁 Voir mes cartes</button></div>';
    const cards=game.hands[seat],options=discard?cards:game.options(seat).cards;
    return '<div class="mist-private cards"><strong>'+(discard?'Tourbillon · Écarte une carte':'Choisis ta carte')+'</strong><div class="mist-hand">'+cards.map(card=>cardButton(card,discard?'discard':'play',options.includes(card))).join('')+'</div></div>';
  }

  function automa(){
    const {cards,draw}=game.options();
    return '<div class="mist-private cards"><strong>'+seatName(game.leader)+' choisit pour l’automa</strong><div class="mist-hand">'+game.hands[2].map(card=>cardButton(card,'play',cards.includes(card))).join('')+
      (draw?'<button class="mist-card hidden-card" data-mist-play="-1" aria-label="Carte cachée">✦</button>':'')+'</div></div>';
  }

  function board(shape,placing){
    const choices=[];
    const preview=anchor>=0?game.fit(anchor,shape,moving):null;
    const cells=game.grid.map((item,i)=>{
      const color=game.mission.ring.get(i);
      const needed=game.mission.ring.has(i)&&(!item||color!==null&&item.color!==color);
      const selectable=placing&&(choosing?item?.type==='spirit':Boolean(game.fit(i,shape,moving)));
      if(selectable)choices.push(i);
      const hint=game.hazards.get(i);
      const icon=item?.type==='goal'?art(6):item?.type==='spirit'?mistSymbols[item.color]:hint==='water'?'↻':hint!==undefined?'☁':needed&&color!==null?mistSymbols[color]:'';
      const tone=item?.color??(color!==null&&color!==undefined?color:hint!==undefined&&hint!=='water'?hint:null);
      const grid=mistXY(i);
      return '<button class="mist-cell" data-mist-cell="'+i+'" data-type="'+(item?.type??'')+'" data-needed="'+needed+'" data-preview="'+Boolean(preview?.includes(i))+'" data-new="'+last.includes(i)+'" style="--tone:'+(tone===null?'#ffe496':mistTone[tone])+'" '+(selectable?'':'disabled')+' tabindex="-1" aria-label="Ligne '+(grid[1]+1)+', colonne '+(grid[0]+1)+(needed?', à couvrir':'')+(needed&&color!==null?' en '+mistNames[color]:'')+'">'+icon+'</button>';
    });
    const first=choices.includes(anchor)?anchor:choices.find(i=>game.mission.ring.has(i))??choices[0];
    if(first!==undefined)cells[first]=cells[first].replace('tabindex="-1"','tabindex="0"');
    return '<div class="mist-board" aria-label="Plateau de mission" data-night="'+game.night+'">'+cells.join('')+'</div>';
  }

  function panel(shape){
    if(game.phase==='trick'&&!busy)return game.turn===2&&count===2?automa():secret();
    if(game.phase==='discard'&&!busy)return secret();
    if(game.phase!=='place'||busy)return '';
    const card=moving>=0?game.tiles[moving].card:game.tile;
    return '<div class="mist-placement" style="--tone:'+mistTone[card.color]+'"><div>'+mini(shape)+'<b>'+(choosing?'Choisis une tuile posée':moving>=0?'Déplace cette tuile':mistNames[card.color]+' '+card.rank)+'</b></div>'+
      '<div class="party-options"><button data-mist-rotate aria-label="Pivoter la tuile" '+(choosing?'disabled':'')+'>⟳</button><button data-mist-flip aria-label="Retourner la tuile" '+(choosing?'disabled':'')+'>⇋</button>'+
      '<button class="party-primary" data-mist-put '+(anchor<0||choosing?'disabled':'')+'>✓ Poser</button></div>'+
      (game.power?'<button class="secondary" data-mist-power>'+(choosing||moving>=0?'Annuler':'↔ Pouvoir '+game.power)+'</button>':'')+'</div>';
  }

  function render(){
    if(game.phase==='finish'&&!busy){finish();return;}
    const placing=game.phase==='place'&&!busy;
    const card=moving>=0?game.tiles[moving].card:game.tile;
    const shape=placing?mistShape(card,rotation,mirror):[];
    const requested=game.trick[0]?.card.color;
    ui.stage.innerHTML='<div class="trip-table mist-table" data-land="'+game.mission.land+'" data-night="'+game.night+'"><header class="trip-hud"><b>'+game.mission.name+'</b><strong aria-live="polite">'+(busy?'Les esprits s’éveillent…':placing?'Pose la tuile':game.phase==='discard'?'Tourbillon':seatName(game.turn))+'</strong><span>☾ '+game.round+'/7</span></header>'+
      '<div class="mist-layout">'+board(shape,placing)+'<div class="mist-panel"><div class="mist-tricks"><span>Atout '+badge(game.trump)+'</span>'+
      (requested===undefined?game.required?'<span>Brume '+game.required.map(badge).join('')+'</span>':'':'<span>Couleur '+badge(requested)+'</span>')+
      '<span>✧ '+game.missing()+' cases</span></div>'+
      '<div class="mist-played" aria-label="Pli joué">'+game.trick.map(({seat,card})=>'<div class="mist-card" style="--tone:'+mistTone[card.color]+'">'+cardFace(card)+'<small>'+seatName(seat)+'</small></div>').join('')+'</div>'+
      panel(shape)+'<div class="mist-history" aria-label="Plis terminés">'+Array.from({length:7},(_,i)=>game.history[i]?badge(game.history[i].color):'<span>·</span>').join('')+'</div></div></div></div>';
  }

  function placementFeedback(){
    privateOpen=false;busy=true;render();
    ui.sound(last.length?[323,481,643,879]:[237,347]);
    ui.later(()=>{last=[];busy=false;render();focus();},530);
  }

  ui.stage.addEventListener('keydown',event=>{
    const current=event.target.closest('[data-mist-cell]');
    const offsets={ArrowDown:12,ArrowUp:-12,ArrowRight:1,ArrowLeft:-1};
    const shift=offsets[event.key];
    if(!current||shift===undefined)return;
    event.preventDefault();
    let id=Number(current.dataset.mistCell)+shift;
    while(id>=0&&id<144){
      const next=ui.stage.querySelector('[data-mist-cell="'+id+'"]:enabled');
      if(next){current.tabIndex=-1;next.tabIndex=0;next.focus();break;}
      id+=shift;
    }
  });

  ui.handle(d=>{
    if('tripCount'in d){count=Number(d.tripCount);setup();ui.focus('[data-trip-count="'+count+'"]');}
    else if('tripSetup'in d)setup();
    else if('mistMap'in d)world();
    else if('mistReset'in d){record=mistEmpty();try{localStorage.removeItem(mistSaveKey);}catch{}world();}
    else if('mistMission'in d){index=Number(d.mistMission);if(available(index)&&record.attempts<22)start();}
    else if(busy)return;
    else if('mistSecret'in d){privateOpen=true;render();focus();}
    else if('mistPlay'in d){
      if(!game.play(Number(d.mistPlay)))return;
      privateOpen=false;resetTile();
      if(game.phase==='place'&&!game.validPlacement())game.finish(false);
      ui.sound(game.phase==='place'?[290,471,639]:[393,498]);render();focus();
    }else if('mistDiscard'in d){
      if(game.discard(game.discardOrder[0],Number(d.mistDiscard))){privateOpen=false;render();focus();}
    }else if('mistPower'in d){if(moving>=0||choosing)resetTile();else{choosing=true;anchor=-1;}render();focus();}
    else if('mistRotate'in d||'mistFlip'in d){
      if('mistRotate'in d)rotation=(rotation+1)%4;else mirror=!mirror;
      const card=moving>=0?game.tiles[moving].card:game.tile;
      if(!game.fit(anchor,mistShape(card,rotation,mirror),moving))anchor=-1;
      render();ui.focus('mistRotate'in d?'[data-mist-rotate]':'[data-mist-flip]');
    }else if('mistCell'in d&&game.phase==='place'){
      const cell=Number(d.mistCell);
      if(choosing){
        moving=game.grid[cell].tile;
        const tile=game.tiles[moving];rotation=tile.rotation;mirror=tile.mirror;anchor=-1;choosing=false;
      }else anchor=cell;
      render();ui.focus(anchor>=0?'[data-mist-put]':'[data-mist-rotate]');
    }else if('mistPut'in d&&anchor>=0){
      if(moving>=0){
        if(!game.shiftTile(moving,anchor,rotation,mirror))return;
        last=game.tiles[moving].cells;
      }else{
        if(!game.put(anchor,rotation,mirror))return;
        last=game.tiles.at(-1).cells;
      }
      resetTile();placementFeedback();
    }
  });
  setup();
}
