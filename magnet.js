const magnetRules='<h2>Cœurs magnétiques</h2><ol><li>Prenez un cœur de votre réserve. Si elle est vide, prenez-en un sur le tapis.</li><li>Choisissez où viser et lancez le cœur. On peut aussi le pousser d’un geste depuis sa zone de tir. Retournez le cœur pour changer son pôle. Deux pôles opposés s’attirent, deux pôles identiques se repoussent.</li><li>Empochez un des groupes formés par votre tir. Un cœur isolé reste sur place. Si un cœur sort du tapis, replacez-le sur un emplacement libre. S’il sort à grande vitesse, le premier à toucher son bouton de joueur pendant le rebond le rattrape.</li><li>Quand il reste au plus deux cœurs sur le tapis, celui qui en a le plus en réserve gagne.</li></ol><p>D’après Attraction, de Jeff Glickman, édité par Matagot. <a href="https://www.matagot.com/fr/family-games/982-1198-attraction.html" target="_blank" rel="noopener">Fiche de l’éditeur</a></p>';

function magnetGame(){
  const ui=tripShell('magnet','Cœurs magnétiques',magnetRules);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let count=2,minimum=2,game,aim,power=.57,animation,gesture,suppressClick=false,sparked=0,drawnPoles;
  const art=(id,extra='')=>tripArt('magnet',id,extra);
  const position=({x,y})=>'--x:'+x/magnetWidth*100+'%;--y:'+y/magnetHeight*100+'%';
  const label=piece=>'Cœur '+(piece.pole?'turquoise':'rubis');
  const focus=()=>ui.focus('.magnet-console button:enabled, [data-magnet-pick], [data-magnet-return]');
  const guide=()=>Math.hypot(aim.x-game.origin.x,aim.y-game.origin.y);

  function setup(){
    ui.cancel();cancelAnimationFrame(animation);ui.music.stop();
    ui.stage.innerHTML='<div class="party-intro"><h1 class="party-sr">Cœurs magnétiques</h1><div class="party-config trip-setup">'+tripPlayers(count,5)+'<fieldset><legend>Groupes</legend><div class="party-options"><button data-magnet-mode="2" aria-pressed="'+(minimum===2)+'">♥♥ Classique</button><button data-magnet-mode="3" aria-pressed="'+(minimum===3)+'">♥♥♥ Trio</button></div></fieldset><button class="party-primary" data-trip-start>▶ Jouer</button></div></div>';
  }

  function start(){
    ui.cancel();cancelAnimationFrame(animation);game=new MagnetMatch(count,minimum);
    aim={x:500,y:300};power=.57;ui.music.start('magnet');render();focus();
  }

  function aimMarkup(){
    const {x,y}=game.origin;
    return '<span class="magnet-ray" aria-hidden="true"></span><span class="magnet-cross" aria-hidden="true">'+art(5)+'</span><span class="magnet-puck magnet-origin" style="'+position({x,y})+'" aria-hidden="true">'+art(game.projectile.pole)+'</span>';
  }

  function setGuide(){
    const surface=ui.stage.querySelector('.magnet-surface'),ray=surface?.querySelector('.magnet-ray'),target=surface?.querySelector('.magnet-cross');
    if(!ray)return;
    const rect=surface.getBoundingClientRect();
    const dx=(aim.x-game.origin.x)*rect.width/magnetWidth,dy=(aim.y-game.origin.y)*rect.height/magnetHeight;
    ray.style.left=game.origin.x/magnetWidth*100+'%';ray.style.top=game.origin.y/magnetHeight*100+'%';
    ray.style.width=Math.hypot(dx,dy)+'px';ray.style.rotate=Math.atan2(dy,dx)*180/Math.PI+'deg';
    target.style.cssText=position(aim);
  }

  function point(event,surface){
    const rect=surface.getBoundingClientRect();
    return {x:Math.max(0,Math.min(magnetWidth,(event.clientX-rect.left)/rect.width*magnetWidth)),
      y:Math.max(0,Math.min(magnetHeight,(event.clientY-rect.top)/rect.height*magnetHeight))};
  }

  function render(){
    const phase=game.phase;
    if(phase==='finish'){
      ui.finish(game.winners.length===1?'Joueur '+(game.winners[0]+1)+' gagne !':'Égalité !',art(6),
        '<div class="magnet-scores">'+game.score.map((items,i)=>'<span style="--seat:'+tripColors[i]+'">Joueur '+(i+1)+' <b>'+items.length+' ♥</b></span>').join('')+'</div>');
      return;
    }
    const hint={pick:'Choisis un cœur',aim:'Vise puis lance',flight:'Le cœur glisse !',catch:'Vite, attrape le cœur !',return:'Replace le cœur sur une case libre',capture:'Choisis un groupe'};
    const spots=phase==='return'?game.freeSpots():[];
    ui.stage.innerHTML='<div class="trip-table magnet-table"><header class="trip-hud"><b style="--seat:'+tripColors[game.turn]+'"><i></i>Joueur '+(game.turn+1)+'</b><strong role="status">'+hint[phase]+'</strong><span>♥ '+game.board.length+'/18</span></header>'+
      '<div class="magnet-surface" data-phase="'+phase+'" '+(phase==='aim'?'tabindex="0" aria-label="Vise sur le tapis avec les flèches. Entrée pour lancer.":':'')+'>'+magnetSpots.map((spot,i)=>spots.includes(i)?'<button class="magnet-home" data-magnet-return="'+i+'" style="'+position(spot)+'" aria-label="Replacer ici">♥</button>':'<span class="magnet-home" style="'+position(spot)+'" aria-hidden="true">♡</span>').join('')+
      game.board.map(piece=>phase==='pick'?'<button class="magnet-puck" data-magnet-pick="'+piece.id+'" style="'+position(piece)+'" aria-label="'+label(piece)+'">'+art(piece.pole)+'</button>':'<span class="magnet-puck" data-puck="'+piece.id+'" style="'+position(piece)+'" aria-hidden="true">'+art(piece.pole)+'</span>').join('')+
      (phase==='aim'?aimMarkup():'')+(phase==='catch'?'<div class="magnet-catching" aria-hidden="true">'+art(game.out[0].pole)+'</div>':'')+
      (phase==='capture'?game.groups.map((group,i)=>{
        const pieces=game.board.filter(piece=>group.includes(piece.id));
        const center={x:pieces.reduce((sum,piece)=>sum+piece.x,0)/pieces.length,y:pieces.reduce((sum,piece)=>sum+piece.y,0)/pieces.length};
        return '<button class="magnet-group" style="'+position(center)+'" data-magnet-group="'+i+'" aria-label="Prendre le groupe de '+group.length+' cœurs">'+art(4)+'<b>'+group.length+'</b></button>';
      }).join(''):'')+'</div>'+
      '<div class="magnet-console">'+(phase==='aim'?'<button data-magnet-flip aria-label="Retourner le cœur">↻ '+art(game.projectile.pole)+'</button><label>Force <input type="range" min="0.18" max="1" step=".01" value="'+power+'" aria-label="Force de lancer"></label><button class="party-primary" data-magnet-fire>➜ Lancer</button>':
        phase==='return'&&!spots.length?'<button class="party-primary" data-magnet-return="-1">↩ Replacer</button>':
        '<span class="magnet-note" aria-live="polite">'+(phase==='pick'||phase==='aim'?game.note:phase==='catch'?'Touche la réserve de ton joueur':'')+'</span>')+'</div>'+
      '<div class="magnet-scores">'+game.score.map((items,i)=>'<button data-magnet-catch="'+i+'" style="--seat:'+tripColors[i]+'" data-current="'+(i===game.turn)+'" '+(phase==='catch'?'':'disabled')+' aria-label="'+(phase==='catch'?'Rattraper pour le joueur ': 'Joueur ')+(i+1)+', '+items.length+' cœurs">'+art(i%2)+'<span>Joueur '+(i+1)+'</span><b>'+items.length+'</b></button>').join('')+'</div></div>';
    if(phase==='aim')setGuide();
  }

  function settle(){
    render();
    if(game.phase==='catch'){
      ui.sound([415,553,659]);
      ui.later(()=>{if(game.missOut()){render();focus();}},2000,false);
    }else{
      if(game.note.includes('capturés'))ui.sound([392,523,663,880]);
      focus();
    }
  }

  function fire(){
    if(guide()<12||!game.launch(aim.x,aim.y,power))return;
    render();ui.sound([194,293,425]);
    const surface=ui.stage.querySelector('.magnet-surface');
    const pieces=new Map([...surface.querySelectorAll('[data-puck]')].map(el=>[Number(el.dataset.puck),el]));
    sparked=game.bonds.size;
    drawnPoles=game.out.length;
    let previous,spill=0;
    const tick=time=>{
      if(!surface.isConnected)return;
      spill+=previous===undefined?17:Math.min(65,time-previous);previous=time;
      while(spill>=1000/60&&game.phase==='flight'){
        game.step();spill-=1000/60;
      }
      for(const [id,el] of pieces){
        const item=game.board.find(piece=>piece.id===id);
        if(item)el.style.cssText=position(item);else el.classList.add('magnet-away');
      }
      if(game.bonds.size>sparked){
        const link=[...game.bonds].at(-1).split(':').map(Number);
        const [a,b]=link.map(id=>game.board.find(piece=>piece.id===id));
        if(a&&b){
          surface.querySelector('.magnet-spark')?.remove();
          surface.insertAdjacentHTML('beforeend','<span class="magnet-spark" style="'+position({x:(a.x+b.x)/2,y:(a.y+b.y)/2})+'">'+art(4)+'</span>');
          ui.sound([372,591,868]);sparked=game.bonds.size;
        }
      }
      if(game.out.length>drawnPoles){drawnPoles=game.out.length;ui.sound([490,315,196]);}
      if(game.phase==='flight')animation=requestAnimationFrame(tick);else settle();
    };
    if(reduced.matches){
      while(game.phase==='flight')game.step();
      settle();
    }else animation=requestAnimationFrame(tick);
  }

  ui.stage.addEventListener('input',event=>{if(event.target.type==='range')power=Number(event.target.value);});
  ui.stage.addEventListener('keydown',event=>{
    if(!event.target.matches('.magnet-surface[data-phase="aim"]'))return;
    if(event.key==='Enter'){event.preventDefault();fire();return;}
    const offsets={ArrowLeft:[-25,0],ArrowRight:[25,0],ArrowUp:[0,-25],ArrowDown:[0,25]};
    if(!offsets[event.key])return;
    event.preventDefault();
    const [dx,dy]=offsets[event.key];
    aim={x:Math.max(0,Math.min(magnetWidth,aim.x+dx)),y:Math.max(0,Math.min(magnetHeight,aim.y+dy))};
    setGuide();
  });
  ui.stage.addEventListener('pointerdown',event=>{
    if(game?.phase!=='aim')return;
    const surface=event.target.closest('.magnet-surface');
    if(!surface)return;
    const at=point(event,surface);
    gesture={id:event.pointerId,start:at,surface,launch:Math.hypot(at.x-game.origin.x,at.y-game.origin.y)<85};
    suppressClick=false;
    surface.setPointerCapture?.(event.pointerId);
  });
  ui.stage.addEventListener('pointermove',event=>{
    if(!gesture||gesture.id!==event.pointerId||!gesture.launch)return;
    aim=point(event,gesture.surface);setGuide();
  });
  ui.stage.addEventListener('pointercancel',()=>{gesture=null;});
  ui.stage.addEventListener('pointerup',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    const {surface,start,launch}=gesture;gesture=null;
    if(game.phase!=='aim')return;
    aim=point(event,surface);setGuide();
    const distance=Math.hypot(aim.x-start.x,aim.y-start.y);
    if(launch&&distance>45){
      suppressClick=true;
      power=Math.min(1,Math.max(.22,distance/390));
      fire();
    }
  });
  ui.stage.addEventListener('click',event=>{
    if(game?.phase!=='aim'||suppressClick||event.target.closest('button'))return;
    const surface=event.target.closest('.magnet-surface');
    if(surface){aim=point(event,surface);setGuide();}
  });
  ui.handle(d=>{
    if('tripCount'in d){count=Number(d.tripCount);setup();ui.focus('[data-trip-count="'+count+'"]');}
    else if('magnetMode'in d){minimum=Number(d.magnetMode);setup();ui.focus('[data-magnet-mode="'+minimum+'"]');}
    else if('tripSetup'in d)setup();
    else if('tripStart'in d)start();
    else if('magnetPick'in d&&game.pick(Number(d.magnetPick))){aim={x:500,y:300};render();ui.focus('[data-magnet-fire]');}
    else if('magnetFlip'in d){game.flip();render();ui.sound([350,510]);ui.focus('[data-magnet-flip]');}
    else if('magnetFire'in d)fire();
    else if('magnetCatch'in d){ui.cancel();if(game.catchOut(Number(d.magnetCatch)))settle();}
    else if('magnetReturn'in d){if(game.returnOut(Number(d.magnetReturn)))settle();}
    else if('magnetGroup'in d){if(game.capture(Number(d.magnetGroup)))settle();}
  });
  setup();
}
