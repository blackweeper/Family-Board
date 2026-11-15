const sandRules='<h2>La Course des embruns</h2><ol><li>La dernière personne à avoir vu la mer commence. À ton tour, touche le moulin ou parie avec un seau.</li><li>Le moulin indique les voiles qui peuvent bouger. Choisis un char pour avancer de deux zones, ou deux chars pour avancer d’une zone chacun. L’aile Tempête peut retourner la course.</li><li>Tu peux placer un seau sur une marche encore libre du podium, ou changer un de tes paris. Un seau remplacé est retiré du jeu.</li><li>Les galets peuvent faire avancer le dernier, reculer le premier, échanger deux chars, déplacer la vague ou donner un nouveau lancer.</li><li>Dès que trois chars sont arrivés, gagne deux étoiles par pari exact et une si le char est sur une autre marche. Le meilleur total gagne, avec égalités possibles.</li></ol><p>D’après Le Vent dans les Voiles, de Sandra Lebrun et Juan Rodriguez, édité par Panoplie. <a href="https://www.ludistri.fr/medias-ludistri/regles/98839/JPA0003_3701625909835_Le_vent_dans_les_voiles-regle.pdf" target="_blank" rel="noopener">Livret du jeu</a></p>';
const sandEffects={tail:['➜','Vent de dos'],head:['↩','Vent de face'],tornado:['↔','Mini-tornade'],tide:['≋','Marée montante'],gust:['⟳','Bourrasque'],storm:['↯','Tempête']};

function sandGame(){
  const ui=tripShell('sand','La Course des embruns',sandRules);
  let count=3,first=0,champion=false,game,selected=[],rank=null,locked=false,spin=0,angle=0,fromAngle=0,storm=false;
  const art=(id,extra='')=>tripArt('sand',id,extra);
  const position=zone=>8+84*zone/7;
  const mark=id=>'<span class="sand-mark" style="--sail:'+tripColors[id]+'" aria-hidden="true">'+sandMarks[id]+'</span>';

  function setup(){
    ui.cancel();ui.music.stop();
    ui.stage.innerHTML='<div class="party-intro"><h1 class="party-sr">La Course des embruns</h1><div class="party-config trip-setup">'+tripPlayers(count,5)+
      '<fieldset><legend>Niveau</legend><div class="party-options"><button data-sand-mode="0" aria-pressed="'+!champion+'">Facile</button><button data-sand-mode="1" aria-pressed="'+champion+'">Champion</button></div></fieldset>'+
      '<label>A vu la mer en dernier <select data-sand-first>'+Array.from({length:count},(_,i)=>'<option value="'+i+'" '+(i===first?'selected':'')+'>Joueur '+(i+1)+'</option>').join('')+'</select></label><button class="party-primary" data-trip-start>▶ Jouer</button></div></div>';
  }

  function start(){
    ui.cancel();game=new ShoreRace(count,first,champion);selected=[];rank=null;locked=false;spin=0;angle=0;fromAngle=0;storm=false;
    ui.music.start('sand');render();ui.focus('[data-sand-spin]');
  }

  function hint(){
    if(locked&&spin)return 'Le moulin tourne !';
    if(game.phase==='turn')return rank===null?'Moulin ou pari ?':'Choisis un seau';
    if(game.phase==='sail')return 'Choisis un ou deux chars';
    if(game.phase==='gust')return 'Relance le moulin';
    if(game.phase==='tornado')return game.tornadoPick===null?'Choisis un premier char':'Choisis le char à échanger';
    if(game.phase==='head'||game.phase==='tail')return 'Choisis le char indiqué';
    return 'Arrivée !';
  }

  function racer(id,eligible){
    const chosen=selected.includes(id)||id===game.tornadoPick;
    return '<button class="sand-pick" data-sand-cart="'+id+'" style="--sail:'+tripColors[id]+'" aria-label="'+sandNames[id]+'" aria-pressed="'+chosen+'" '+(eligible?'':'disabled')+'>'+art(id)+mark(id)+'</button>';
  }

  function render(){
    const eligible=game.phase==='sail'?game.wind:game.candidates();
    const wind=game.notice?sandEffects[game.notice]:null;
    const bets=game.bets[game.turn];
    ui.stage.innerHTML='<div class="trip-table sand-table"><header class="trip-hud"><b style="--seat:'+tripColors[game.turn]+'"><i></i>Joueur '+(game.turn+1)+'</b><strong role="status">'+hint()+'</strong><span>🏁 '+game.podium.length+'/3</span></header>'+
      '<div class="sand-course '+(storm?'sand-weather':'')+'" data-reverse="'+(game.direction<0)+'"><div class="sand-wave" style="--x:'+position(game.wave)+'%;"></div>'+
      '<span class="sand-line" style="--x:'+position(game.finishLine)+'%;" aria-label="Arrivée">⚑</span>'+
      [...game.pebbles.keys()].map(zone=>'<span class="sand-pebble" style="--x:'+position(zone)+'%">'+art(7)+'</span>').join('')+
      game.remaining().map(id=>'<button class="sand-cart" data-sand-cart="'+id+'" data-place="'+id+'" style="--x:'+position(game.carts[id])+'%;--y:'+(24+id*12.6)+'%;--sail:'+tripColors[id]+'" aria-label="'+sandNames[id]+'" aria-pressed="'+(selected.includes(id)||game.tornadoPick===id)+'" '+(!locked&&eligible.includes(id)?'':'disabled')+'>'+art(id)+'</button>').join('')+
      (storm?'<div class="sand-storm">'+art(5)+'</div>':'')+'</div>'+
      '<div class="sand-controls"><div class="sand-wind"><button class="sand-mill" data-sand-spin aria-label="Faire tourner le moulin" '+(!locked&&['turn','gust'].includes(game.phase)?'':'disabled')+'><span class="sand-wheel '+(spin?'spinning':'')+'" style="--angle:'+angle+'deg;--start:'+fromAngle+'deg">'+[...tripColors,'#fff2bf'].map((color,id)=>'<i style="--blade:'+color+';--spin:'+id*60+'deg">'+(sandMarks[id]||'↯')+'</i>').join('')+'</span></button>'+
      '<div class="sand-prompt">'+(wind?'<b class="sand-effect" aria-live="polite">'+wind[0]+' '+wind[1]+'</b>':'')+
      (game.phase==='sail'||eligible.length?'<div class="sand-choices">'+eligible.map(id=>racer(id,!locked)).join('')+'</div>':'')+
      (game.phase==='sail'&&selected.length?'<button class="party-primary" data-sand-go>➜ '+(selected.length===1?'2 cases':'1 case chacun')+'</button>':'')+
      (['turn','gust'].includes(game.phase)?'<button class="party-primary" data-sand-spin '+(locked?'disabled':'')+'>↻ '+(game.phase==='gust'?'Relancer':'Moulin')+'</button>':'')+'</div></div>'+
      '<div class="sand-castle"><div class="sand-podium" aria-label="Podium officiel">'+art(6)+game.podium.map((id,i)=>'<span class="sand-rank" data-rank="'+i+'" aria-label="'+sandNames[id]+' à la place '+(i+1)+'">'+art(id)+'</span>').join('')+'</div>'+
      '<div class="sand-bets"><div class="sand-steps">'+bets.map((id,i)=>'<button data-sand-rank="'+i+'" aria-label="Parier sur la place '+(i+1)+'" aria-pressed="'+(rank===i)+'" '+(!locked&&game.canBet()&&i>=game.podium.length?'':'disabled')+'><b>'+['🥇','🥈','🥉'][i]+'</b>'+(id===null?'<span>＋</span>':mark(id))+'</button>').join('')+'</div>'+
      (rank===null?'':'<div class="sand-choices" aria-label="Seaux disponibles">'+game.buckets.map((left,id)=>'<button class="sand-bucket" data-sand-bet="'+id+'" style="--sail:'+tripColors[id]+'" aria-label="'+sandNames[id]+', '+left+' seaux" '+(!left||bets[rank]===id?'disabled':'')+'>'+mark(id)+'<small>'+left+'</small></button>').join('')+'</div>')+'</div></div></div></div>';
  }

  function animate(action,ms=570){
    const old=game.carts.slice(), oldDirection=game.direction, oldWave=game.wave;
    action();
    selected=[];rank=null;spin=0;locked=true;storm=oldDirection!==game.direction||oldWave!==game.wave||game.notice==='tornado';
    render();
    ui.stage.querySelectorAll('[data-place]').forEach(el=>{
      const id=Number(el.dataset.place);
      const dx=position(old[id])-position(game.carts[id]);
      if(dx&&el.animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)el.animate([{left:position(old[id])+'%',offset:0},{left:position(game.carts[id])+'%',offset:1}],{duration:ms-35,easing:'ease-out'});
    });
    const wave=ui.stage.querySelector('.sand-wave');
    if(oldWave!==game.wave&&wave.animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)wave.animate([{left:position(oldWave)+'%'},{left:position(game.wave)+'%'}],{duration:ms-35,easing:'ease-out'});
    ui.sound(storm?[179,233,348,470]:[352,484,623]);
    ui.later(()=>{
      locked=false;storm=false;
      if(game.phase==='finish'){
        const scores=game.score(),best=Math.max(...scores),players=scores.flatMap((score,i)=>score===best?[i+1]:[]);
        ui.finish((players.length===1?'Joueur '+players[0]+' gagne !':'Égalité !'),game.podium.map(id=>art(id)).join(''),
          '<div class="sand-scores">'+scores.map((score,i)=>'<span style="--seat:'+tripColors[i]+'" data-best="'+(score===best)+'">Joueur '+(i+1)+' <b>'+score+' ★</b></span>').join('')+'</div>');
        return;
      }
      render();ui.focus('.sand-controls button:enabled');
    },ms);
  }

  ui.stage.addEventListener('change',event=>{if(event.target.matches('[data-sand-first]'))first=Number(event.target.value);});
  ui.handle(d=>{
    if('tripCount'in d){count=Number(d.tripCount);first=Math.min(first,count-1);setup();ui.focus('[data-trip-count="'+count+'"]');}
    else if('sandMode'in d){champion=d.sandMode==='1';setup();ui.focus('[data-sand-mode="'+d.sandMode+'"]');}
    else if('tripSetup'in d)setup();
    else if('tripStart'in d)start();
    else if(locked)return;
    else if('sandSpin'in d){
      locked=true;spin=1;rank=null;
      const index=Math.floor(game.random()*6);
      fromAngle=angle;
      angle+=1080+((360-index*60-angle%360+360)%360);
      render();ui.sound([262,315,395,441,493]);ui.later(()=>animate(()=>game.spin(index)),840);
    }else if('sandCart'in d){
      const id=Number(d.sandCart);
      if(game.phase==='sail'){
        if(selected.includes(id))selected=selected.filter(cart=>cart!==id);
        else selected=[...selected.slice(-1),id];
        render();ui.focus('.sand-choices [data-sand-cart="'+id+'"]');
      }else animate(()=>game.pebble(id));
    }else if('sandGo'in d)animate(()=>game.move(selected));
    else if('sandRank'in d){rank=Number(d.sandRank)===rank?null:Number(d.sandRank);render();ui.focus(rank===null?'[data-sand-rank="'+d.sandRank+'"]':'[data-sand-bet]:enabled');}
    else if('sandBet'in d){if(!game.bet(rank,Number(d.sandBet)))return;rank=null;ui.sound([523,698]);render();ui.focus('[data-sand-spin]');}
  });
  setup();
}
