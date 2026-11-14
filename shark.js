const sharkRules = `<h2>Le banquet</h2><ol><li>Au signal, chaque requin touche une pile dans sa zone. Les choix restent cachés jusqu’à la révélation commune.</li><li>Le plus de mâchoires réclame la pile. Une égalité laisse les cartes en place. Une bouteille donne deux mâchoires pour la manche suivante, sur la même pile ou deux piles.</li><li>Un trésor donne la prochaine carte. Une arête est écartée. La marée ajoute une carte par pile, visible si la précédente est cachée ou si la pile est vide.</li><li>Les sucettes valent 1, les salades 2, un seul plateau vaut 3. Par couleur, deux poissons ou deux sushis valent 3, puis 1 par carte supplémentaire.</li><li>Cinq tridents gagnent immédiatement. Sinon, quand la marée ne peut plus remplir toutes les piles, le meilleur score gagne. À égalité, un seul requin affamé remporte la partie, sinon la victoire est partagée.</li></ol><h3>Cartes Mordantes</h3><ul><li>Grosse faim compte deux plateaux de crustacés.</li><li>Super larcin permet de voler une carte quand on trouve un trésor.</li><li>Grosse vague rend toutes les cartes du banquet visibles.</li><li>Amas d’arêtes donne 5 points aux requins avec le plus d’arêtes.</li></ul><p>Adaptation de Cric Crac Kroc, de Corentin Lebrat et Théo Rivière, édité par LOKI.</p><p><a href="https://loki-kids.com/wp-content/uploads/2025/03/Cric-Crac-Kroc_Rulebook_FR.pdf" target="_blank" rel="noopener">Livret officiel</a></p>`;
const sharkColors=['#83e9eb','#f7a6e8','#ffb48c','#e7eb82','#b9e49d'];
const sharkNames=['Bulle','Marteau','Corail','Rayon','Mousse'];
const sharkArt=(id,extra='')=>`<span class="sh-art ${extra}" aria-hidden="true" style="--ax:${id%4*100/3}%;--ay:${Math.floor(id/4)*50}%"></span>`;
const sharkAvatar=id=>sharkArt(9+id%3,'sh-avatar sh-avatar-'+id);

function sharkGame() {
  let count=3, ruleChoice='classic', game, choices=[], phase='setup', timer, sequence, generation=0, muted=false;
  const soundtrack=familyMusic();
  const effects=partyEffects();
  app.innerHTML=`<section class="party sh"><div class="party-bar"><button class="secondary" id="back">← Jeux</button><button class="secondary" data-sh-sound aria-pressed="true">♪ Son</button><button class="secondary" data-sh-rules>? Règles</button></div><div class="sh-stage"></div><dialog class="party-rules">${sharkRules}<form method="dialog"><button class="party-primary">Fermer</button></form></dialog></section>`;
  const root=app.querySelector('.sh');
  const stage=root.querySelector('.sh-stage');
  const dialog=root.querySelector('dialog');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const focus=sel=>stage.querySelector(sel)?.focus({preventScroll:true});

  function setup() {
    generation++;
    clearTimeout(timer);
    soundtrack.stop();
    phase='setup';
    stage.innerHTML=`<div class="party-intro sh-intro"><h1 class="party-sr">Festin des requins</h1><div class="party-config"><fieldset><legend>Requins</legend><div class="party-options">${[2,3,4,5].map(n=>`<button data-sh-count="${n}" aria-pressed="${n===count}">${n}</button>`).join('')}</div></fieldset><label>Carte Mordante <select data-sh-variant><option value="classic">Partie classique</option><option value="random">Carte surprise</option><option value="all">Les quatre cartes</option>${sharkVariants.map((label,i)=>`<option value="${i}">${label}</option>`).join('')}</select></label><button class="party-primary" data-sh-start>▶ Jouer</button></div></div>`;
    stage.querySelector('select').value=ruleChoice;
  }

  function start() {
    const variants=ruleChoice==='classic'?[]:ruleChoice==='random'?[Math.floor(Math.random()*4)]:ruleChoice==='all'?[0,1,2,3]:[Number(ruleChoice)];
    game=new SharkFeast(count,variants);
    soundtrack.start('shark');
    effects.play([349,523,698],muted);
    begin();
  }

  function begin() {
    choices=game.players.map(()=>[]);
    phase='pick';
    render();
    focus('[data-sh-seat]');
  }

  function playerPanel(p,seat) {
    const quota=p.hungry?2:1;
    const taken=choices[seat].length;
    const tally=Array.from({length:9},(_,kind)=>p.cards.filter(c=>c===kind).length);
    const group=tally.map((n,i)=>n?`<span aria-label="${sharkFood[i]}, ${n}">${sharkArt(i)}<b>${n}</b></span>`:'').join('');
    return `<section class="sh-player" style="--seat:${sharkColors[seat]}" data-hungry="${p.hungry}" aria-label="${sharkNames[seat]}"><header>${sharkAvatar(seat)}<div><strong>${sharkNames[seat]}</strong><small>${'◆'.repeat(quota)} ${taken===quota?'✓':''}</small></div><b aria-label="Points">★ ${game.tally(seat)}</b></header><div class="sh-collection">${group||'<span aria-hidden="true">✧</span>'}</div><div class="sh-picks">${game.piles.map((pile,i)=>`<button data-sh-seat="${seat}" data-sh-vote="${i}" aria-label="${sharkNames[seat]}, pile ${i+1}" ${phase!=='pick'||taken>=quota||!pile.length?'disabled':''}>${i+1}</button>`).join('')}</div></section>`;
  }

  function render(event={}) {
    const note=phase==='pick'?'Choisis ta pile en secret':event.type==='tide'?'La marée apporte des cartes':event.type==='bite'?(event.owners.length===1?'Attrapé !':'Égalité, la pile reste !'):event.type==='card'?sharkFood[event.kind]:phase==='steal'?'Choisis une carte à voler':'Les requins révèlent leurs choix';
    const variants=[...game.variants].map(i=>sharkVariants[i]).join(' · ');
    stage.innerHTML=`<div class="sh-table" data-phase="${phase}" data-event="${event.type||''}"><header class="sh-status"><span>⚓ ${game.round}</span><strong role="status">${note}</strong><span>▰ ${game.deck.length}</span></header>${variants?`<p class="sh-variant">${variants}</p>`:''}
      <div class="sh-banquet">${game.piles.map((pile,i)=>{
        const top=pile.at(-1), selected=event.index===i;
        const votes=phase==='pick'?[]:choices.flatMap((list,seat)=>list.filter(n=>n===i).map(()=>seat));
        const won=selected && event.owners.length===1;
        return `<div class="sh-stack ${selected?'sh-hit':''}" data-size="${Math.min(pile.length,3)}" data-pile="${i}" data-tie="${selected&&!won}"><b>${i+1}</b><div class="sh-card ${!top?'empty':!top.visible?'back':''}" aria-label="${!top?'Pile vide':top.visible?sharkFood[top.kind]:'Carte cachée'}">${!top?'✧':top.visible?sharkArt(top.kind):'≋'}</div>${won?'<i class="sh-chomp" aria-hidden="true"></i>':''}<small>×${pile.length}</small><div class="sh-votes">${votes.map(seat=>`<i style="--seat:${sharkColors[seat]}">${sharkAvatar(seat)}</i>`).join('')}</div></div>`;
      }).join('')}</div><div class="sh-players" data-count="${count}">${game.players.map(playerPanel).join('')}</div>
      ${event.type==='card'?`<div class="sh-reveal" style="--seat:${sharkColors[event.seat]}" aria-hidden="true">${sharkArt(event.kind)}${sharkAvatar(event.seat)}</div>`:''}
      ${phase==='steal'?`<div class="party-overlay"><div class="party-popup sh-steal"><h2>${sharkNames[event.seat]} choisit</h2>${event.options.map(from=>`<div>${sharkAvatar(from)}<div class="party-options">${game.players[from].cards.map((kind,index)=>`<button data-sh-from="${from}" data-sh-card="${index}" aria-label="${sharkFood[kind]}">${sharkArt(kind)}</button>`).join('')}</div></div>`).join('')}</div></div>`:''}</div>`;
  }

  function finish() {
    phase='finish';
    soundtrack.stop();
    effects.play([392,523,659,784,1047],muted);
    stage.innerHTML=`<div class="party-finish sh-finish">${partyConfetti()}<div class="party-trophy">🏆</div><h2>${game.winners.length===1?sharkNames[game.winners[0]]+' gagne !':'Victoire partagée !'}</h2><div class="party-champions">${game.winners.map(seat=>`<div style="--seat:${sharkColors[seat]}">${sharkAvatar(seat)}<b>★ ${game.tally(seat)}</b></div>`).join('')}</div><div class="party-options"><button class="party-primary" data-sh-start>↻ Rejouer</button><button data-sh-setup>Réglages</button></div></div>`;
    focus('[data-sh-start]');
  }

  function advance(run,answer) {
    if(run!==generation)return;
    const next=sequence.next(answer);
    if(next.done) { if(game.winners)finish();else begin();return; }
    phase=next.value.type==='steal'?'steal':'reveal';
    render(next.value);
    if(next.value.type==='bite')effects.play(next.value.owners.length===1?[300,160,480]:[260,230],muted);
    else if(next.value.type==='tide')effects.play([523,698,932],muted);
    if(phase==='steal'){focus('[data-sh-from]');return;}
    const delay=next.value.type==='bite'?560:next.value.type==='tide'?620:330;
    timer=setTimeout(()=>advance(run),reduced.matches?10:delay);
  }

  root.addEventListener('change',e=>{if(e.target.matches('[data-sh-variant]')) ruleChoice=e.target.value;});
  root.addEventListener('click',e=>{
    const button=e.target.closest('button');
    if(!button||button.disabled)return;
    const d=button.dataset;
    if(button.id==='back'){generation++;clearTimeout(timer);soundtrack.close();effects.close();home('[data-detail="shark"]');}
    else if('shRules' in d)dialog.showModal();
    else if('shSound' in d){muted=!muted;partyMute(button,soundtrack,muted);if(muted)effects.close();}
    else if('shCount' in d){count=Number(d.shCount);setup();focus(`[data-sh-count="${count}"]`);}
    else if('shStart' in d)start();
    else if('shSetup' in d)setup();
    else if(phase==='steal'&&'shFrom' in d)advance(generation,{from:Number(d.shFrom),index:Number(d.shCard)});
    else if(phase==='pick'&&'shSeat' in d){
      const seat=Number(d.shSeat), quota=game.players[seat].hungry?2:1;
      if(choices[seat].length>=quota)return;
      choices[seat].push(Number(d.shVote));
      if(choices.every((list,i)=>list.length===(game.players[i].hungry?2:1))){
        phase='reveal';sequence=game.resolve(choices);render();
        timer=setTimeout(()=>advance(generation),reduced.matches?10:460);
      }else {
        const panel=button.closest('.sh-player');
        panel.querySelector('header small').textContent='◆'.repeat(quota)+(choices[seat].length===quota?' ✓':'');
        if(choices[seat].length===quota)panel.querySelectorAll('[data-sh-seat]').forEach(item=>item.disabled=true);
      }
    }
  });
  setup();
}
