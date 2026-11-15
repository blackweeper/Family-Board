const spaceportRules='<h2>Fusées en fête</h2><h3>Embarquement · dès 4 ans</h3><ol><li>La plus jeune personne commence avec la fusée spéciale de quatre animaux. Chaque joueur prépare trois fusées, ou deux à cinq joueurs.</li><li>Les deux animaux sur chaque pile donnent un indice. Retourne une carte. Si l’animal peut embarquer chez toi, choisis une de tes fusées. Sinon, offre-le à un autre joueur qui en a besoin.</li><li>Une fusée décolle quand toutes ses places sont remplies. Le premier joueur à faire décoller toutes ses fusées gagne.</li></ol><h3>Navettes · dès 5 ans</h3><ol><li>Chacun regarde sa couleur espion en secret. Retourne une carte parmi les trois piles à ton tour. Les deux symboles indiquent les couleurs possibles.</li><li>Complète une navette de la même couleur qui attend cette pièce. Sinon, commence une nouvelle navette. La quatrième pièce permet d’y placer un astronaute.</li><li>Tu peux utiliser chacun de tes pouvoirs une fois. Le radar donne une pioche de plus si ta prédiction est exacte. La réserve te laisse choisir une pièce en secret. Ta navette espion peut s’attacher à une navette complète de sa couleur et y déposer un astronaute.</li><li>Le premier à poser ses trois astronautes gagne. Si toutes les cartes et actions disponibles sont épuisées, le plus grand nombre d’astronautes placés l’emporte.</li></ol><p>D’après Fuzéo, de Thomas Favrelière et Diogo Cardoso, édité par Panoplie. <a href="https://debacle.fr/wp-content/uploads/2025/07/JPA0001-3701625909811-Fuzeo-Regles-imp.pdf" target="_blank" rel="noopener">Livret du jeu</a></p>';
const spacePowerLabels={radar:'Radar',reserve:'Réserve',spy:'Espion'};

function spaceportGame(){
  const ui=tripShell('spaceport','Fusées en fête',spaceportRules);
  let count=3,first=0,mode='animals',game,locked=false,privateOpen=false,radar=null;
  const art=(id,extra='')=>tripArt('spaceport',id,extra);
  const equipment=id=>tripArt('spaceparts',id);
  const swatch=id=>'<span class="space-swatch" style="--ship:'+tripColors[id]+'" aria-hidden="true">'+spaceEmblems[id]+'</span>';

  function setup(){
    ui.cancel();ui.music.stop();
    ui.stage.innerHTML='<div class="party-intro"><h1 class="party-sr">Fusées en fête</h1><div class="party-config trip-setup">'+tripPlayers(count,5)+
      '<fieldset><legend>Mission</legend><div class="party-options"><button data-space-mode="animals" aria-pressed="'+(mode==='animals')+'">🐼 Embarquement</button><button data-space-mode="ships" aria-pressed="'+(mode==='ships')+'">🚀 Navettes</button></div></fieldset>'+
      '<label>Le plus jeune <select data-space-first>'+Array.from({length:count},(_,i)=>'<option value="'+i+'" '+(i===first?'selected':'')+'>Joueur '+(i+1)+'</option>').join('')+'</select></label><button class="party-primary" data-trip-start>▶ Jouer</button></div></div>';
  }

  function start(){
    ui.cancel();game=new SpaceExpedition(count,first,mode);locked=false;privateOpen=false;radar=null;
    ui.music.start('spaceport');render();focus();
  }

  function finish(){
    const title=game.winners.length>1?'Équipages ex æquo !':'L’équipage '+(game.winners[0]+1)+' remporte la mission !';
    ui.finish(title,game.winners.map(i=>'<span style="--seat:'+tripColors[i]+'">'+art(mode==='animals'?i:7)+'</span>').join(''));
  }

  function focus(){
    if(!locked&&game.phase!=='finish')ui.focus('[data-space-secret], .space-reveal button:enabled, .space-piles button:enabled, .space-fleet button:enabled, .space-teams button:enabled, .space-powers button:enabled');
  }

  function shipPiece(color,part){
    return '<span class="space-piece" data-piece="'+part+'" style="--ship:'+tripColors[color]+'" aria-hidden="true">'+equipment(color)+'</span>';
  }

  function shipView(ship,i,options){
    const pieces=[0,1,2,3].map(part=>ship.pieces.includes(part)?shipPiece(ship.color,part):'<span class="space-piece space-missing" aria-hidden="true"></span>').join('');
    const won=ship.owner!==null;
    const body='<div class="space-tiles">'+pieces+'</div>'+(won?'<div class="space-owners">'+[ship.owner,...ship.spies].map(player=>'<b style="--seat:'+tripColors[player]+'" aria-label="Joueur '+(player+1)+'">'+(player+1)+'</b>').join('')+'</div>':'');
    const recent=game.report?.index===i&&['piece','complete','spy'].includes(game.report.type);
    const label='Navette '+spaceColors[ship.color].toLowerCase()+', '+ship.pieces.length+' sur 4';
    return options.includes(i)?'<button class="space-ship" data-space-ship="'+i+'" style="--ship:'+tripColors[ship.color]+'" aria-label="Compléter '+label+'">'+body+'</button>':
      '<div class="space-ship '+(recent?'space-recent':'')+'" style="--ship:'+tripColors[ship.color]+'" aria-label="'+label+'" data-builtin="'+ship.pieces.length+'">'+body+'</div>';
  }

  function goalView(goal,player,index,choices){
    const full=goal.filled.every(Boolean);
    const active=choices.some(seat=>seat.player===player&&seat.index===index);
    const just=game.report?.player===player&&game.report.index===index&&['launch','board'].includes(game.report.type);
    const type=active?'button':'div';
    const needed=goal.animals.filter((_,slot)=>!goal.filled[slot]).map(animal=>spaceAnimals[animal]);
    return '<'+type+' class="space-goal '+(full?'ready ':'')+(just?'space-boarding':'')+'" '+(active?'data-space-player="'+player+'" data-space-goal="'+index+'"':'')+' aria-label="Fusée '+(index+1)+', joueur '+(player+1)+(full?', prête':', places pour '+needed.join(', '))+'">'+
      equipment(player)+'<span class="space-passengers">'+goal.animals.map((animal,i)=>'<span data-seated="'+goal.filled[i]+'" title="'+spaceAnimals[animal]+'">'+art(animal)+'</span>').join('')+'</span>'+(full?'<b aria-label="Décollée">✓</b>':'')+'</'+type+'>';
  }

  function secret(){
    const player=game.players[game.turn];
    const type=game.phase==='brief';
    return '<div class="space-private" role="group" aria-label="'+(type?'Couleur espion':'Réserve secrète')+'">'+art(7)+
      '<h2>'+(privateOpen?(type?'Ta couleur espion':'Choisis une pièce'):'Passe l’écran au joueur '+(game.turn+1))+'</h2>'+
      (privateOpen?(type?'<span class="space-secret-color" aria-label="'+spaceColors[player.spy]+'">'+swatch(player.spy)+'</span><button class="party-primary" data-space-confirm>✓ Cacher</button>':
        '<div class="space-reserve">'+game.reserve.map((card,i)=>'<button data-space-reserve="'+i+'" aria-label="'+spaceColors[card.color]+', pièce '+(card.part+1)+'">'+shipPiece(card.color,card.part)+swatch(card.color)+'</button>').join('')+'</div>'):
        '<button class="party-primary" data-space-secret>👁 Je suis le joueur '+(game.turn+1)+'</button>')+
      (type?'':'<button class="secondary" data-space-cancel>Retour</button>')+'</div>';
  }

  function reveal(){
    if(game.phase!=='reveal')return '';
    const card=game.pending;
    const extra=game.report?.type==='radar-hit'?' · Radar réussi !':game.report?.type==='radar-miss'?' · Radar manqué':'';
    return '<div class="space-reveal" role="status">'+(mode==='animals'?art(card.animal):shipPiece(card.color,card.part))+
      '<strong>'+(mode==='animals'?spaceAnimals[card.animal]:spaceColors[card.color])+extra+'</strong>'+
      (mode==='animals'&&!game.seats().length?'<button class="party-primary" data-space-discard>✕ Mettre de côté</button>':'')+
      (mode==='ships'&&!game.shipOptions().length?'<button class="party-primary" data-space-ship="-1">＋ Nouvelle navette</button>':'')+'</div>';
  }

  function render(){
    const player=game.players[game.turn], hidden=['brief','reserve'].includes(game.phase);
    const activeDraw=!locked&&['draw','extra','radar'].includes(game.phase);
    const choices=mode==='animals'&&game.phase==='reveal'&&!locked?game.seats():[];
    const report=game.report?.type;
    if(game.phase==='finish'&&!locked){finish();return;}
    const title={draw:'Choisis une pile',extra:'Radar réussi · Rejoue !',radar:'Radar · Devine la couleur',reveal:mode==='animals'?'Fais embarquer cet animal':'Pose la pièce'};
    const last={launch:'Décollage !',complete:'Navette complète !',spy:'Navette espion amarrée !',board:'Embarquement réussi',piece:'Pièce en place',discard:'Carte mise de côté'};
    ui.stage.innerHTML='<div class="trip-table space-table"><header class="trip-hud"><b style="--seat:'+tripColors[game.turn]+'"><i></i>Joueur '+(game.turn+1)+'</b><strong role="status">'+
      (hidden?'🔒 Mission secrète':locked?(last[report]||'Carte retournée !'):(title[game.phase]||'Mission accomplie'))+'</strong><span>✦ '+(mode==='animals'?'Embarquement':'Navettes')+'</span></header>'+
      (hidden?secret():'<div class="space-command"><div class="space-piles">'+game.visible.map((card,i)=>'<button data-space-pile="'+i+'" '+(!card||!activeDraw?'disabled':'')+' aria-pressed="'+(radar===i)+'" aria-label="'+(card?'Pile '+(i+1)+' · '+(mode==='animals'?card.animals.map(id=>spaceAnimals[id]):card.colors.map(id=>spaceColors[id])).join(' ou '):'Pile vide')+'">'+
        (card?(mode==='animals'?card.animals.map(id=>art(id)).join(''):card.colors.map(swatch).join('')):'<span>—</span>')+'</button>').join('')+'</div>'+
      (game.phase==='radar'?'<div class="space-guess">'+(radar===null?'':game.visible[radar].colors.map(id=>'<button data-space-guess="'+id+'" aria-label="'+spaceColors[id]+'">'+swatch(id)+'</button>').join(''))+'<button class="secondary" data-space-cancel>Retour</button></div>':'')+
      (mode==='ships'&&game.phase==='draw'?'<div class="space-powers">'+spacePowers.map((key,i)=>'<button data-space-power="'+key+'" '+(locked||!game.canPower(key)?'disabled':'')+' data-spent="'+!player.powers[key]+'">'+equipment(i+5)+'<b>'+spacePowerLabels[key]+'</b></button>').join('')+'</div>':'')+
      reveal()+'</div>')+
      (!hidden&&mode==='ships'?'<div class="space-fleet">'+(game.ships.map((ship,i)=>shipView(ship,i,!locked&&game.phase==='reveal'?game.shipOptions():[])).join('')||'<div class="space-empty">'+art(6)+'</div>')+'</div>':'')+
      (!hidden?'<div class="space-teams" style="--count:'+count+'">'+game.players.map((actor,i)=>
        '<section class="space-team '+(i===game.turn?'active':'')+'" style="--seat:'+tripColors[i]+'"><header>'+art(i)+'<b>Joueur '+(i+1)+'</b><span>'+actor.score+'/'+(mode==='animals'?actor.goals.length:3)+'</span></header>'+
        (mode==='animals'?'<div class="space-goals">'+actor.goals.map((g,j)=>goalView(g,i,j,choices)).join('')+'</div>':'<div class="space-crew">'+[0,1,2].map(j=>art(7,actor.score>j?'boarded':'')).join('')+'</div>')+'</section>').join('')+'</div>':'')+
      (locked&&['launch','complete','spy'].includes(report)?'<div class="space-blast" aria-hidden="true">'+equipment(game.report.color??game.report.player)+'<i></i><i></i><i></i></div>':'')+'</div>';
    if(locked)ui.stage.querySelectorAll('.space-reveal button').forEach(button=>{button.disabled=true;});
  }

  function animate(notes,ms){
    locked=true;render();ui.sound(notes);
    ui.later(()=>{locked=false;render();focus();},ms);
  }

  function committed(ok){
    if(!ok)return;
    const big=['launch','complete','spy'].includes(game.report?.type);
    animate(big?[262,392,523,659,784,1047]:[380,559],big?900:380);
  }

  ui.stage.addEventListener('change',event=>{if(event.target.matches('[data-space-first]'))first=Number(event.target.value);});
  ui.handle(d=>{
    if('tripCount'in d){count=Number(d.tripCount);first=Math.min(first,count-1);setup();ui.focus('[data-trip-count="'+count+'"]');}
    else if('spaceMode'in d){mode=d.spaceMode;setup();ui.focus('[data-space-mode="'+mode+'"]');}
    else if('tripSetup'in d)setup();
    else if('tripStart'in d)start();
    else if(locked)return;
    else if('spaceSecret'in d){privateOpen=true;render();ui.focus('[data-space-confirm], [data-space-reserve]');}
    else if('spaceConfirm'in d){game.confirmBrief();privateOpen=false;render();focus();}
    else if('spaceCancel'in d){game.cancelPower();radar=null;privateOpen=false;render();focus();}
    else if('spacePile'in d){
      if(game.phase==='radar'){radar=Number(d.spacePile);render();ui.focus('[data-space-guess]');}
      else if(game.reveal(Number(d.spacePile)))animate([303,463,629],460);
    }else if('spacePower'in d){
      if(!game.power(d.spacePower))return;
      if(d.spacePower==='spy')committed(true);
      else{privateOpen=false;render();focus();}
    }else if('spaceReserve'in d){privateOpen=false;if(game.pickReserve(Number(d.spaceReserve)))animate([328,510,653],460);}
    else if('spaceGuess'in d){if(game.guess(radar,Number(d.spaceGuess))){radar=null;animate([262,523,698],460);}}
    else if('spaceGoal'in d)committed(game.resolveAnimal(Number(d.spacePlayer),Number(d.spaceGoal)));
    else if('spaceDiscard'in d)committed(game.resolveAnimal());
    else if('spaceShip'in d)committed(game.build(Number(d.spaceShip)));
  });
  setup();
}
