const krakenRules='<h2>À l’assaut du Kraken</h2><ol><li>Choisissez vos pirates et leur zone de départ. À ton tour, lance les dés. Les symboles font avancer les tentacules correspondants. Un œil fait avancer tous les tentacules de sa couleur. Une face vide les laisse en place.</li><li>Choisis une des deux cartes. Utilise autant de ses actions que tu veux, dans l’ordre de ton choix. Tu peux te déplacer vers une zone voisine, réparer un bastingage ou repousser un tentacule avec le canon, le pistolet ou le sabre selon sa distance.</li><li>Une grimace avance le Kraken et peut ajouter des dés. Quand il surgit, choisis le tentacule qu’il remplace. Chaque attaque réussie contre lui compte. Trois touches sauvent le bateau, ou une en mode Moussaillons. Au quatrième trou, le bateau coule.</li><li>En solo, choisis deux pirates et joue avec leur pioche commune. En mode Tempête, pose de un à quatre tourbillons qui accélèrent les tentacules. Un tourbillon sur la dernière case provoque immédiatement une attaque.</li></ol><p>D’après Kraken Attack!, d’Esteban et Antoine Bauza, édité par LOKI. <a href="https://iello.fr/regles/Rulebook_Kraken-Attack.pdf" target="_blank" rel="noopener">Livret du jeu</a></p>';
const krakenPowers=['Refait une action','Peut ignorer les yeux','Pistolet à distance','Canon sur tout un côté'];
const krakenSeats=['#aadd8f','#ffa09b','#e0b1fa','#8adbe6'];

function krakenGame(){
  const ui=tripShell('kraken','À l’assaut du Kraken',krakenRules);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let count=2,pirates=[0,1],level='normal',game,deploy=0,slot=null,action=null,dice=[],busy=false,note='';
  const art=(id,extra='')=>tripArt('kraken',id,extra);
  const toolsArt=(id)=>tripArt('kraken-tools',id);
  const toolIds={move:0,cannon:1,pistol:2,saber:3,repair:4,wild:5};
  const symbol=(key)=>krakenActions[key][0];
  const laneX=lane=>22+(lane%4)*18.65;
  const laneY=(lane,depth)=>lane<4?10+depth*7.5:90-depth*7.5;
  const zoneX=zone=>zone%2?68:31;
  const zoneY=zone=>zone<2?43:57;
  const at=(x,y)=>'--x:'+x+'%;--y:'+y+'%';

  function setup(){
    ui.cancel();ui.music.stop();
    ui.stage.innerHTML='<div class="party-intro"><h1 class="party-sr">À l’assaut du Kraken</h1><div class="trip-setup">'+
      '<div class="party-config"><fieldset><legend>Joueurs</legend><div class="party-options">'+[1,2,3,4].map(i=>'<button data-trip-count="'+i+'" aria-pressed="'+(count===i)+'">'+i+'</button>').join('')+'</div></fieldset><fieldset><legend>Équipage</legend><div class="party-options">'+
      [['easy','Moussaillons'],['normal','Classique'],['hard','Tempête']].map(([id,name])=>'<button data-kk-mode="'+id+'" aria-pressed="'+(level===id)+'">'+name+'</button>').join('')+
      '</div></fieldset><button class="party-primary" data-trip-start>▶ Jouer</button></div>'+
      '<div class="kk-choice" aria-label="Choix des pirates">'+krakenNames.map((name,i)=>'<button data-kk-crew="'+i+'" style="--seat:'+krakenSeats[i]+'" aria-pressed="'+pirates.includes(i)+'">'+art(i)+(pirates.includes(i)?'<span class="kk-order" aria-label="Ordre de jeu">'+(pirates.indexOf(i)+1)+'</span>':'')+'<b>'+name+'</b><small>'+krakenPowers[i]+'</small></button>').join('')+'</div></div></div>';
  }

  function start(){
    ui.cancel();busy=false;deploy=0;slot=null;action=null;dice=[];note='';
    game=new KrakenCrew(pirates.slice(),count,level);ui.music.start('kraken');render();focus();
  }

  function focus(){
    if(!busy)ui.focus('.kk-console button:enabled, .kk-ocean button:enabled');
  }

  function render(){
    if(game.phase==='finish'&&!busy){
      ui.finish(game.won?'Le Kraken retourne dans les profondeurs !':'Le bateau a pris l’eau !',game.won?pirates.map(id=>art(id)).join(''):art(6));
      return;
    }
    const p=game.phase,config=p==='deploy',actor=config?deploy:game.actor;
    const available=p==='act'&&action?game.choices(action):[];
    const hint=note||({deploy:'Choisis une zone de départ',roll:'Lance les dés',card:'Choisis une carte Action',act:action?'Touche la zone éclairée':'Choisis une action',summon:'Choisis où le Kraken surgit',finish:game.won?'Victoire !':'Le bateau coule !'})[p];
    const possible=(slot,kind)=>game.slotActions(slot).includes(kind)&&game.choices(kind).length;
    const icon=(kind)=>'<span class="kk-symbol" data-action="'+kind+'" aria-hidden="true">'+toolsArt(toolIds[kind])+'</span>';
    ui.stage.innerHTML='<div class="trip-table kk-table"><header class="trip-hud"><b style="--seat:'+krakenSeats[pirates[actor]??0]+'">'+art(pirates[actor]??0)+' '+krakenNames[pirates[actor]??0]+'</b><strong role="status">'+hint+'</strong><span aria-label="'+game.holes.length+' trous sur 4">'+Array.from({length:4},(_,i)=>i<game.holes.length?'✖':'◈').join(' ')+'</span></header>'+
      '<div class="kk-meter"><div aria-label="Piste de colère du Kraken">'+Array.from({length:8},(_,i)=>'<span data-on="'+(game.rage>=i)+'">'+(i===game.rage&&game.boss<0?art(6):krakenDiceSteps.includes(i)?'⚄':'•')+'</span>').join('')+'</div><b aria-label="Kraken repoussé '+game.hits+' fois">'+Array.from({length:level==='easy'?1:3},(_,i)=>i<game.hits?'★':'☆').join(' ')+'</b></div>'+
      '<div class="kk-ocean">'+game.lanes.map((depth,lane)=>{
        const side=lane<4?0:1, x=laneX(lane), color=side?'#c9a1f6':'#ffa08b';
        const attack=krakenDepthActions[depth];
        const enabled=!busy&&(p==='summon'||action===attack&&available.includes(lane)&&action!=='move'&&action!=='repair');
        return '<span class="kk-lane" style="--x:'+x+'%;--lane-tint:'+color+'" data-side="'+side+'" aria-hidden="true"></span>'+
          [0,1,2,3].map(i=>{
            const whirling=game.whirls.has(lane*4+i);
            const place=config&&!busy&&level==='hard'&&i>0;
            return '<'+(place?'button':'span')+' class="kk-cell '+(whirling?'whirling':'')+'" style="'+at(x,laneY(lane,i))+';--lane-tint:'+color+'" '+(place?'data-kk-whirl="'+(lane*4+i)+'" aria-label="Tourbillon, couloir '+(lane+1)+', '+krakenDepth[i]+'" aria-pressed="'+whirling+'"':'aria-hidden="true"')+'>'+(whirling?'@':i?symbol(krakenDepthActions[i]):krakenMarks[lane%4])+'</'+(place?'button':'span')+'>';
          }).join('')+
          '<button class="kk-tentacle '+(game.boss===lane?'kk-boss':'')+'" data-kk-lane="'+lane+'" data-depth="'+depth+'" style="'+at(x,laneY(lane,depth))+'" '+(enabled?'':'disabled')+' aria-label="'+(game.boss===lane?'Kraken':'Tentacule '+(side?'violet':'rouge'))+', '+krakenDepth[depth]+', couloir '+(lane+1)+'">'+art(game.boss===lane?6:side+4)+'</button>'+
          '<button class="kk-rail" data-kk-rail="'+lane+'" style="'+at(x,side?65:35)+'" '+(!busy&&action==='repair'&&available.includes(lane)?'':'disabled')+' aria-label="Bastingage '+(lane+1)+', '+(game.rails[lane]?'intact':'cassé')+'" data-intact="'+game.rails[lane]+'">'+(game.rails[lane]?toolsArt(7):'⚒')+'</button>';
      }).join('')+
      [0,1,2,3].map(zone=>'<button class="kk-zone" data-kk-zone="'+zone+'" style="'+at(zoneX(zone),zoneY(zone))+'" '+(!busy&&(config||action==='move'&&available.includes(zone))?'':'disabled')+' aria-label="Zone '+(zone+1)+'">'+(config||action==='move'?'◉':'')+'</button>').join('')+
      game.positions.map((zone,player)=>'<span class="kk-pirate" data-kk-pirate="'+player+'" style="'+at(zoneX(zone)+(game.positions.filter((where,i)=>where===zone&&i<player).length)*4-2,zoneY(zone))+';--seat:'+krakenSeats[pirates[player]]+'" data-active="'+(player===actor)+'">'+art(pirates[player])+'</span>').join('')+
      game.holes.map((lane,i)=>'<span class="kk-hole" style="'+at(laneX(lane)+i%2*4,lane<4?43:57)+'">'+art(7)+'</span>').join('')+
      '<div class="kk-spray"></div></div>'+
      '<div class="kk-console"><div class="kk-dice '+(busy&&dice.length?'kk-shake':'')+'" aria-label="Dés du Kraken">'+dice.map(die=>'<span data-side="'+die.side+'" aria-label="'+(die.face===5?'Face vide':die.face===4?'Œil du Kraken':'Couloir '+(die.face+1))+'">'+(die.face===5?'':die.face===4?'◉':krakenMarks[die.face])+'</span>').join('')+'</div>'+
      (config?'<div class="kk-deploy">'+pirates.map((id,i)=>'<button data-kk-deploy="'+i+'" aria-label="Placer '+krakenNames[id]+'" aria-pressed="'+(deploy===i)+'">'+art(id)+'</button>').join('')+
        (level==='hard'?'<span class="kk-whirls">↻ '+game.whirls.size+'/4</span>':'')+'<button class="party-primary" data-kk-board>⚓ À bord</button></div>':'')+
      (p==='roll'?'<button class="party-primary" data-kk-roll '+(busy?'disabled':'')+'>⚄ Lancer les dés</button>':'')+
      (p==='card'?'<div class="kk-cards">'+game.hand.map((card,i)=>'<button data-kk-card="'+i+'" class="kk-card" '+(busy?'disabled':'')+' aria-label="'+card.actions.map(key=>krakenActions[key][1]).join(', ')+(card.taunt?', puis grimace':'')+'">'+art(card.pirate)+card.actions.map(icon).join('')+(card.taunt?'<span class="kk-grimace">'+toolsArt(6)+'</span>':'')+'</button>').join('')+'</div>':'')+
      (p==='act'?'<div class="kk-actions">'+game.actions.map((key,i)=>key?'<button data-kk-slot="'+i+'" aria-label="'+krakenActions[key][1]+'" aria-pressed="'+(slot===i)+'" '+(busy||!Object.keys(krakenActions).some(kind=>possible(i,kind))?'disabled':'')+'>'+icon(key)+'<small>'+krakenActions[key][1]+'</small></button>':'<span class="kk-used">✓</span>').join('')+
        (game.power===0&&!game.repeated&&game.done.length?[...new Set(game.done)].filter(kind=>game.choices(kind).length).map(kind=>'<button data-kk-repeat="'+kind+'" aria-label="Refaire '+krakenActions[kind][1]+'">'+icon(kind)+'<small>＋1</small></button>').join(''):'')+
        (slot!==null&&game.actions[slot]==='wild'?'<div class="kk-wild">'+game.slotActions(slot).map(kind=>'<button data-kk-tool="'+kind+'" aria-label="'+krakenActions[kind][1]+'" aria-pressed="'+(action===kind)+'" '+(busy||!game.choices(kind).length?'disabled':'')+'>'+icon(kind)+'</button>').join('')+'</div>':'')+
        '<button class="party-primary" data-kk-next '+(busy?'disabled':'')+'>'+(game.selected.taunt?'😝 ':'')+'→ Fin du tour</button></div>':'')+'</div></div>';
  }

  function animate(events,ms=550,tool){
    busy=true;
    const heavy=events.find(item=>['hole','break','boss-hit','summon'].includes(item.type));
    if(heavy)note={hole:'Un trou dans la coque !',break:'Le bastingage casse !','boss-hit':'Le Kraken recule !',summon:'Le Kraken surgit !'}[heavy.type];
    render();
    const ocean=ui.stage.querySelector('.kk-ocean');
    if(ocean&&!reduced.matches){
      const rect=ocean.getBoundingClientRect();
      const moved=new Set();
      for(const event of events){
        if(event.type==='move'){
          const piece=ocean.querySelector('[data-kk-pirate="'+event.pirate+'"]');
          piece?.animate([{transform:'translate('+((zoneX(event.from)-zoneX(event.to))*rect.width/100)+'px,'+((zoneY(event.from)-zoneY(event.to))*rect.height/100)+'px)'},{transform:'translate(0)'}],{duration:ms-55,easing:'ease-out'});
        }else if(event.from!==undefined&&!moved.has(event.lane)){
          moved.add(event.lane);
          const piece=ocean.querySelector('[data-kk-lane="'+event.lane+'"]');
          const last=events.filter(item=>item.lane===event.lane).at(-1);
          piece?.animate([{transform:'translateY('+((laneY(event.lane,event.from)-laneY(event.lane,last.to))*rect.height/100)+'px)'},{transform:'translateY(0)'}],{duration:ms-55,easing:'ease-out'});
        }
      }
      if(heavy) {
        const splash=ocean.querySelector('.kk-spray');
        splash.style.cssText=at(laneX(heavy.lane),laneY(heavy.lane,heavy.from??2));
        splash.classList.add('kk-burst');
        ocean.classList.add('kk-impact');
      }
      const impact=events.find(event=>['hit','boss-hit','repair'].includes(event.type));
      if(impact&&tool){
        const y=tool==='repair'?(impact.lane<4?35:65):laneY(impact.lane,impact.from);
        ocean.insertAdjacentHTML('beforeend','<span class="kk-action-flash" style="'+at(laneX(impact.lane),y)+'" aria-hidden="true">'+toolsArt(toolIds[tool])+'</span>');
      }
    }
    ui.sound(heavy?(heavy.type==='boss-hit'?[310,523,710]:[170,251,190]):[275,408,580]);
    ui.later(()=>{busy=false;note='';render();focus();},ms);
  }

  ui.handle(d=>{
    if('tripCount'in d){
      count=Number(d.tripCount);const amount=Math.max(2,count);
      pirates=[...new Set([...pirates,0,1,2,3])].slice(0,amount);
      setup();ui.focus('[data-trip-count="'+count+'"]');
    }else if('kkCrew'in d){
      const id=Number(d.kkCrew);
      if(count!==4&&!pirates.includes(id))pirates=[...pirates.slice(1),id];
      else if(pirates.includes(id))pirates=[id,...pirates.filter(p=>p!==id)];
      setup();ui.focus('[data-kk-crew="'+id+'"]');
    }else if('kkMode'in d){level=d.kkMode;setup();ui.focus('[data-kk-mode="'+level+'"]');}
    else if('tripSetup'in d)setup();
    else if('tripStart'in d)start();
    else if(busy)return;
    else if('kkDeploy'in d){deploy=Number(d.kkDeploy);render();focus();}
    else if('kkWhirl'in d){
      const cell=Number(d.kkWhirl);
      if(game.whirl(Math.floor(cell/4),cell%4)){render();ui.focus('[data-kk-whirl="'+cell+'"]');}
    }else if('kkBoard'in d){game.start();render();focus();}
    else if('kkRoll'in d){dice=game.roll();if(dice)animate(game.events,630);}
    else if('kkCard'in d){if(game.choose(Number(d.kkCard))){slot=null;action=null;render();focus();}}
    else if('kkSlot'in d){
      slot=Number(d.kkSlot);action=game.actions[slot]==='wild'?null:game.actions[slot];render();
      ui.focus(action?'.kk-ocean button:enabled':'[data-kk-tool]:enabled');
    }else if('kkTool'in d){action=d.kkTool;render();ui.focus('.kk-ocean button:enabled');}
    else if('kkRepeat'in d){slot=-1;action=d.kkRepeat;render();ui.focus('.kk-ocean button:enabled');}
    else if('kkNext'in d){
      if(game.complete()){slot=null;action=null;dice=[];animate(game.events,590);}
    }else if('kkZone'in d||'kkLane'in d||'kkRail'in d){
      const target=Number(d.kkZone??d.kkLane??d.kkRail);
      if(game.phase==='deploy'){game.deploy(deploy,target);render();focus();}
      else if(game.phase==='summon'){if(game.summon(target))animate(game.events,700);}
      else if(action&&(slot===-1?game.repeat(action,target):game.act(slot,action,target))){
        const tool=action;
        slot=null;action=null;dice=[];animate(game.events,480,tool);
      }
    }
  });
  setup();
}
