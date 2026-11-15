const flockRules='<h2>Les Brebis des cimes</h2><ol><li>Lancez deux dés pour tous les troupeaux. Chaque berger peut utiliser les deux symboles dans l’ordre de son choix. Le joker doré vaut n’importe quel symbole.</li><li>Touche une brebis éclairée ou fais-la glisser vers le haut. Une brebis avance d’un étage et pousse celles qui sont juste devant elle. Les flèches permettent aussi de pousser en diagonale, toujours en ligne droite.</li><li>Vous jouez tous pendant le même lancer. Vous pouvez passer une fois vos déplacements terminés. Le premier troupeau arrivé au pâturage gagne. Si plusieurs troupeaux arrivent au même lancer, le dé départage leurs symboles.</li><li>Avec Mémé, pousse-la depuis l’arrière. Une brebis qui la dépasse retourne à l’arrière. Le petit agneau doit rester à côté d’une brebis de son symbole, sinon il passe le prochain lancer pour la rejoindre.</li></ol><p>D’après Saï Saï, de Vincent Miramon, édité par Panoplie. <a href="https://undecent.fr/wp-content/uploads/2025/12/Sai-Sai.pdf" target="_blank" rel="noopener">Livret du jeu</a></p>';
const flockNames=['Dorper','Mérinos','Columbia','Latxa'];
const flockPaths=['Estive','Torrent','Bruyère','Fougères'];
const flockMarks=['Cœur bleu','Soleil jaune','Feuille violette','Étoile rouge','Joker'];

function flockGame(){
  const ui=tripShell('flock','Les Brebis des cimes',flockRules);
  let count=2,modes=[0,0,0,0],paths=[0,1,2,3],directions=[],game,busy=false,moving=[];
  const mark=(id,extra='')=>'<span class="flock-mark '+extra+'" style="--mark:'+flockColors[id]+'" aria-hidden="true">'+flockSymbols[id]+'</span>';
  const art=(id,extra='')=>tripArt('flock',id,extra);

  function setup(){
    ui.cancel();ui.music.stop();
    ui.stage.innerHTML='<div class="party-intro"><h1 class="party-sr">Les Brebis des cimes</h1><div class="trip-setup"><div class="party-config">'+tripPlayers(count,4)+'<button class="party-primary" data-trip-start>▶ Jouer</button></div><div class="flock-config">'+flockNames.slice(0,count).map((name,i)=>
      '<fieldset style="--seat:'+tripColors[i]+'"><legend>'+name+'</legend><div class="party-options"><button data-path="'+i+'" aria-label="Changer le chemin de '+name+'">'+flockPaths[paths[i]]+'</button><button data-variant="'+i+'" data-bit="1" aria-label="Mémé Brebis pour '+name+'" title="Mémé Brebis" aria-pressed="'+Boolean(modes[i]&1)+'">'+art(4)+'</button><button data-variant="'+i+'" data-bit="2" aria-label="Petit Agneau pour '+name+'" title="Petit Agneau" aria-pressed="'+Boolean(modes[i]&2)+'">'+art(5)+'</button></div></fieldset>').join('')+'</div></div></div>';
  }

  function start(){
    ui.cancel();busy=false;moving=[];directions=Array(count).fill(0);
    game=new MeadowRace(count,modes,paths);
    ui.music.start('flock');render();ui.focus('[data-flock-roll]');
  }

  function teamBoard(team,player){
    const active=game.phase==='move'&&!team.done&&!busy;
    const sheep=team.sheep.map(piece=>{
      const motion=moving.find(item=>item.player===player&&item.id===piece.id);
      const x=piece.col*25+12.5, y=(5-piece.row)*100/6+100/12;
      const picture=piece.kind==='granny'?4:piece.kind==='lamb'?5:player;
      const enabled=active&&game.chain(player,piece.id,directions[player]).length>0;
      return '<button class="flock-sheep '+(motion?'flock-moving ':'')+(piece.row>=6?'flock-arrived':'')+'" data-flock-team="'+player+'" data-sheep="'+piece.id+'" style="--x:'+x+'%;--y:'+y+'%;'+(motion?'--dx:'+((motion.from.col-piece.col)*100/(4*.234))+'%;--dy:'+((piece.row-motion.from.row)*100/(6*.172))+'%;':'')+'" '+(enabled?'':'disabled')+' aria-label="'+(piece.kind==='granny'?'Mémé Brebis':piece.kind==='lamb'?'Petit agneau '+flockMarks[piece.symbol]:'Brebis '+flockMarks[piece.symbol])+'">'+art(picture)+(piece.symbol===undefined?'':mark(piece.symbol))+'</button>';
    }).join('');
    return '<section class="flock-run" data-path-tone="'+team.path+'" style="--seat:'+tripColors[player]+'"><header>'+art(player)+'<strong>'+flockNames[player]+'</strong><span aria-label="Symbole du troupeau">'+mark(player)+'</span><b>'+game.arrived(player)+'/'+team.sheep.length+'</b></header><div class="flock-track" aria-label="Chemin du troupeau">'+sheep+'</div><div class="flock-tools"><div class="flock-dice">'+team.dice.map(id=>mark(id)).join('')+'</div>'+[-1,0,1].map((side,i)=>'<button data-flock-side="'+side+'" data-flock-team="'+player+'" aria-label="'+['Pousser à gauche','Pousser tout droit','Pousser à droite'][i]+'" aria-pressed="'+(directions[player]===side)+'" '+(active?'':'disabled')+'>'+['↖','↑','↗'][i]+'</button>').join('')+'<button data-flock-pass="'+player+'" aria-label="Terminer les déplacements de '+flockNames[player]+'" '+(active?'':'disabled')+'>↪</button></div></section>';
  }

  function render(){
    if(game.phase==='finish'&&!busy){ui.finish(flockNames[game.winner]+' mène son troupeau au pâturage !',art(game.winner));return;}
    const rollingTurn=game.phase==='roll'&&!game.tied;
    const arrived=moving.filter(item=>item.to.row===6);
    ui.stage.innerHTML='<div class="trip-table flock-table"><div class="flock-hud"><div>'+art(6,arrived.length?'flock-gate':'')+'<strong>Le pâturage</strong>'+(arrived.length?'<small class="flock-points">+'+arrived.length+'</small>':'')+'</div><div class="flock-dice '+(busy&&!moving.length?'rolling':'')+'" aria-label="'+game.dice.map(i=>flockMarks[i]).join(', ')+'">'+(game.dice.length?game.dice.map(id=>mark(id)).join(''):'<span aria-hidden="true">⚄ ⚄</span>')+'</div><button class="party-primary" data-flock-roll '+(game.phase==='roll'&&!busy?'':'disabled')+' aria-label="'+(rollingTurn?flockNames[game.roller]+', lancer les dés':game.tied?'Départager':'Lancer les dés')+'">'+(rollingTurn?art(game.roller):'⚄ ')+(game.tied?'Départager':'Lancer')+'</button></div><div class="flock-runs" style="--count:'+count+'">'+game.teams.map(teamBoard).join('')+'</div></div>';
  }

  function push(player,id,side){
    const action=game.push(player,id,side);
    if(!action)return;
    moving=action;busy=true;render();
    ui.sound(action.some(item=>item.to.row===6)?[523,659,784]:[289,365,473]);
    ui.later(()=>{moving=[];busy=false;render();if(game.phase==='roll')ui.focus('[data-flock-roll]');},390);
  }

  let swipe;
  ui.stage.addEventListener('pointerdown',event=>{
    const sheep=event.target.closest('[data-sheep]:enabled');
    if(sheep)swipe={x:event.clientX,y:event.clientY,id:event.pointerId,button:sheep};
  });
  ui.stage.addEventListener('pointercancel',()=>{swipe=null;});
  ui.stage.addEventListener('pointerup',event=>{
    if(!swipe||swipe.id!==event.pointerId)return;
    const gesture=swipe;swipe=null;
    const rise=gesture.y-event.clientY,offset=event.clientX-gesture.x;
    if(busy||rise<21)return;
    const {flockTeam,sheep}=gesture.button.dataset;
    const player=Number(flockTeam);
    push(player,Number(sheep),Math.abs(offset)>rise*.55?Math.sign(offset):0);
  });

  ui.handle(d=>{
    if('tripCount'in d){count=Number(d.tripCount);setup();ui.focus('[data-trip-count="'+count+'"]');}
    else if('path'in d){paths[d.path]=(paths[d.path]+1)%flockPaths.length;setup();ui.focus('[data-path="'+d.path+'"]');}
    else if('variant'in d){modes[d.variant]^=Number(d.bit);setup();ui.focus('[data-variant="'+d.variant+'"][data-bit="'+d.bit+'"]');}
    else if('tripSetup'in d)setup();
    else if('tripStart'in d)start();
    else if(busy)return;
    else if('flockRoll'in d){
      game.throwDice();busy=true;render();ui.sound([330,392,523]);
      ui.later(()=>{busy=false;render();ui.focus(game.phase==='roll'?'[data-flock-roll]':'[data-sheep]:enabled');},465);
    }else if('flockSide'in d){
      directions[d.flockTeam]=Number(d.flockSide);render();ui.focus('[data-flock-team="'+d.flockTeam+'"][data-flock-side="'+d.flockSide+'"]');
    }else if('sheep'in d)push(Number(d.flockTeam),Number(d.sheep),directions[d.flockTeam]);
    else if('flockPass'in d){game.endTeam(Number(d.flockPass));render();ui.focus(game.phase==='roll'?'[data-flock-roll]':'[data-sheep]:enabled');}
  });
  setup();
}
