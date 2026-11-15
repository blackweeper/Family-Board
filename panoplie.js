const tripColors=['#73ded0','#ff8b7e','#ffdc77','#a8e076','#c1a9ff'];

function tripArt(theme,id,extra='') {
  return '<span class="trip-art '+extra+'" aria-hidden="true" style="--atlas:url(./covers/'+theme+'-icons.webp);--ax:'+(id%4*100/3)+'%;--ay:'+(Math.floor(id/4)*100)+'%"></span>';
}

function tripPlayers(count,max) {
  return '<fieldset><legend>Joueurs</legend><div class="party-options">'+Array.from({length:max-1},(_,i)=>i+2).map(n=>'<button data-trip-count="'+n+'" aria-pressed="'+(count===n)+'">'+n+'</button>').join('')+'</div></fieldset>';
}

function tripShell(id,title,rules) {
  const music=familyMusic(), effects=partyEffects();
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let muted=false, timer;
  app.innerHTML='<section class="party trip '+id+'"><div class="party-bar"><button class="secondary" id="back">← Jeux</button><button class="secondary" data-trip-sound aria-pressed="true">♪ Son</button><button class="secondary" data-trip-rules>? Règles</button></div><div class="trip-stage"></div><dialog class="party-rules" aria-label="Règles de '+title+'">'+rules+'<form method="dialog"><button class="party-primary">Fermer</button></form></dialog></section>';
  const root=app.querySelector('.trip'), stage=root.querySelector('.trip-stage'), dialog=root.querySelector('dialog');
  const focus=selector=>stage.querySelector(selector)?.focus({preventScroll:true});
  root.querySelector('#back').onclick=()=>{clearTimeout(timer);music.close();effects.close();home('[data-detail="'+id+'"]');};
  root.querySelector('[data-trip-rules]').onclick=()=>dialog.showModal();
  root.querySelector('[data-trip-sound]').onclick=event=>{
    muted=!muted;partyMute(event.currentTarget,music,muted);if(muted)effects.close();
  };
  return {
    stage,music,focus,
    sound(notes){effects.play(notes,muted);},
    later(action,ms,animation=true){clearTimeout(timer);timer=setTimeout(action,motion.matches&&animation?30:ms);},
    cancel(){clearTimeout(timer);},
    handle(action){stage.onclick=event=>{const button=event.target.closest('button');if(button&&!button.disabled&&!dialog.open)action(button.dataset,button);};},
    finish(heading,art,more=''){
      music.stop();
      stage.innerHTML='<div class="party-finish">'+partyConfetti()+'<h2>'+heading+'</h2><div class="trip-winners">'+art+'</div>'+more+'<div class="party-options"><button class="party-primary" data-trip-start>↻ Rejouer</button><button data-trip-setup>Réglages</button></div></div>';
      effects.play([392,523,659,784,1047],muted);focus('[data-trip-start]');
    },
  };
}
