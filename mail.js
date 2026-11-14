const mailRules=`<h2>La tournée d’anniversaire</h2><ol><li>Le plus âgé commence comme facteur en chef. Choisis un lapin parmi les deux portes éclairées.</li><li>Chacun a trois images. Le chef choisit celle qui évoque le mieux le lapin invité. Les apprentis choisissent chacun une carte pour l’autre lapin. Passez l’écran à la personne indiquée pour garder les mains secrètes.</li><li>Les images sont mélangées. Sans se concerter, les apprentis votent en secret pour l’invitation. Deux bonnes réponses font venir les deux lapins du terrier à la fête.</li><li>Le soleil avance et le rôle de chef passe au joueur suivant. Piochez une nouvelle image et rendez-vous au prochain terrier qui attend son invitation. La fête commence quand les huit lapins sont à table ou quand arrive dimanche.</li></ol><p>En partant le lundi, vous avez six tournées. En partant le mercredi, vous en avez quatre.</p><p>D’après Dixit Kids, d’Élodie Clément, Théo Rivière et Jean-Louis Roubira. <a href="https://cdn.svc.asmodee.net/production-asmodeekids/uploads/2025/12/DixitKids-Rules-VD-v2-FR.pdf" target="_blank" rel="noopener">Livret officiel</a></p>`;
const mailDays=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const mailSeats=['#a8eee0','#f8bc8f','#c1c2ff','#eeb8e7','#ffdd87','#b9e795'];
const mailRabbit=(id,extra='')=>`<span class="mail-rabbit ${extra}" aria-hidden="true" style="--sprite:url('./covers/mail-rabbits-${Math.floor(id/8)}.webp');--sx:${id%4*100/3}%;--sy:${Math.floor(id%8/4)*100}%"></span>`;
const mailPicture=(id,extra='')=>`<span class="mail-picture ${extra}" aria-hidden="true" style="--sprite:url('./covers/mail-cards-${Math.floor(id/12)}.webp');--sx:${id%4*100/3}%;--sy:${Math.floor(id%12/4)*50}%"></span>`;

function mailGame() {
  let count=3, first=0, hard=false, game, privacy=true, muted=false;
  const soundtrack=familyMusic(), effects=partyEffects();
  app.innerHTML=`<section class="party mail"><div class="party-bar"><button class="secondary" id="back">← Jeux</button><button class="secondary" data-mail-sound aria-pressed="true">♪ Son</button><button class="secondary" data-mail-rules>? Règles</button></div><div class="mail-stage"></div><dialog class="party-rules" aria-label="Règles du Courrier des lapins">${mailRules}<form method="dialog"><button class="party-primary">Fermer</button></form></dialog>`;
  const root=app.querySelector('.mail'), stage=root.querySelector('.mail-stage'), dialog=root.querySelector('dialog');
  const focus=selector=>stage.querySelector(selector)?.focus({preventScroll:true});

  function setup() {
    soundtrack.stop(); game=null;
    stage.innerHTML=`<div class="party-intro mail-intro"><h1 class="party-sr">Le Courrier des lapins</h1><div class="party-config"><fieldset><legend>Facteurs</legend><div class="party-options">${[3,4,5,6].map(n=>`<button data-mail-count="${n}" aria-pressed="${n===count}">${n}</button>`).join('')}</div></fieldset><fieldset><legend>Tournée</legend><div class="party-options"><button data-mail-mode="easy" aria-pressed="${!hard}">☀ Lundi</button><button data-mail-mode="hard" aria-pressed="${hard}">⏳ Mercredi</button></div></fieldset><label>Le plus âgé <select data-mail-first>${Array.from({length:count},(_,i)=>`<option value="${i}" ${i===first?'selected':''}>Joueur ${i+1}</option>`).join('')}</select></label><button class="party-primary" data-mail-start>▶ Jouer</button></div></div>`;
  }

  function homeBadge(home,index) {
    return `<span class="mail-home" data-map-home="${index}" data-active="${index===game.home&&game.phase!=='finish'}" data-done="${home.delivered}" aria-label="Terrier ${index+1}${home.delivered?', courrier livré':''}">${home.delivered?'✓':index===game.home?'✉':index+1}</span>`;
  }

  function finish() {
    soundtrack.stop();
    const labels=['La factrice attend ses amis','Une fête en petit comité','La fête est belle !','Une fête mémorable !','Une fête grandiose !'];
    stage.innerHTML=`<div class="party-finish mail-finish">${partyConfetti()}<div class="party-trophy">🎂</div><h2>${labels[game.invited/2]}</h2><b>${game.invited} / 8 lapins à la fête</b><div class="mail-guests">${game.homes.flatMap(home=>home.delivered?home.doors.map(door=>mailRabbit(door.id)):[]).join('')}</div><div class="party-options"><button class="party-primary" data-mail-start>↻ Rejouer</button><button data-mail-setup>Réglages</button></div></div>`;
    effects.play([392,523,659,784],muted);
    focus('[data-mail-start]');
  }

  function render() {
    if(game.phase==='finish'){finish();return;}
    const {phase,home,seat,chief,guest}=game;
    const current=game.homes[home];
    const local=seat===chief?'Choisis l’invitation':'Choisis le courrier de l’autre lapin';
    const selectCards=phase==='submit'&&!privacy;
    const voteCards=phase==='vote'&&!privacy;
    const result=phase==='result';
    const closed=(phase==='submit'||phase==='vote')&&privacy;
    const expected=game.guest===null?null:current.doors[phase==='submit'&&seat!==chief?1-guest:guest];
    const heading=phase==='guest'?'Choisis un lapin à inviter':closed?'Passe l’écran':phase==='submit'?local:phase==='vote'?'Retrouve l’invitation':game.hits>=2?'Courrier livré !':'On repassera !';
    stage.innerHTML=`<div class="mail-table" data-phase="${phase}" data-private="${closed}" style="--seat:${mailSeats[seat]}"><header class="mail-hud"><div class="mail-week" aria-label="${mailDays[game.day]}">${mailDays.map((date,i)=>`<span data-current="${i===game.day}" title="${date}">${i===game.day?'☀':i===6?'🎂':i+1}</span>`).join('')}</div><strong>🐇 ${game.invited}/8</strong></header>
      <div class="mail-body"><div class="mail-map" aria-label="Les quatre terriers">${game.homes.map(homeBadge).join('')}<div class="mail-center-guests" data-origin="${home}">${game.homes.map((place,i)=>`<div class="mail-guest-pair ${result&&i===home&&place.delivered?'mail-arriving':''}">${place.delivered?place.doors.map(door=>mailRabbit(door.id)).join(''):''}</div>`).join('')}</div></div>
      <div class="mail-actions"><div class="mail-status" role="status"><strong>${heading}</strong><small>${result?game.hits+' bonnes réponses':phase==='guest'?'Facteur en chef · Joueur '+(chief+1):'Joueur '+(seat+1)}</small></div>
      ${phase==='guest'?`<div class="mail-doors">${current.doors.map((door,i)=>`<button data-mail-guest="${i}" aria-label="Lapin ${mailMoods[door.mood].toLowerCase()}">${mailRabbit(door.id)}<span>${mailMoods[door.mood]}</span></button>`).join('')}</div>`:''}
      ${closed?`<div class="mail-envelope" aria-hidden="true"><span>✉</span><b>${seat+1}</b></div><button class="party-primary" data-mail-ready>👁 Je suis le joueur ${seat+1}</button>`:''}
      ${selectCards||voteCards?`<div class="mail-clue">${mailRabbit(expected.id)}<span>${mailMoods[expected.mood]}</span></div>`:''}
      ${selectCards?`<div class="mail-cards">${game.hands[seat].map((id,i)=>`<button data-mail-card="${i}" aria-label="Choisir l’image ${i+1}">${mailPicture(id)}</button>`).join('')}</div>`:''}
      ${voteCards||result?`<div class="mail-cards ${result?'mail-results':''}">${game.entries.map(({card},i)=>result?`<div data-mail-result="${i}" data-correct="${i===game.correct}">${mailPicture(card)}<small>${i===game.correct?'✉ ':''}${[...game.votes.values()].filter(v=>v===i).length} ✓</small></div>`:`<button data-mail-vote="${i}" aria-label="Voter pour l’image ${i+1}">${mailPicture(card)}</button>`).join('')}</div>`:''}
      ${result?'<button class="party-primary" data-mail-next>☀ Continuer</button>':''}</div></div></div>`;
    const next={guest:'[data-mail-guest]',submit:closed?'[data-mail-ready]':'[data-mail-card]',vote:closed?'[data-mail-ready]':'[data-mail-vote]',result:'[data-mail-next]'};
    focus(next[phase]);
  }

  root.addEventListener('change',event=>{if(event.target.matches('[data-mail-first]'))first=Number(event.target.value);});
  root.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button||button.disabled)return;
    const d=button.dataset;
    if(button.id==='back'){soundtrack.close();effects.close();home('[data-detail="mail"]');}
    else if('mailSound' in d){muted=!muted;partyMute(button,soundtrack,muted);if(muted)effects.close();}
    else if('mailRules' in d)dialog.showModal();
    else if('mailCount' in d||'mailMode' in d){if('mailCount' in d)count=Number(d.mailCount);else hard=d.mailMode==='hard';first=Math.min(count-1,first);setup();focus('mailCount' in d?`[data-mail-count="${count}"]`:`[data-mail-mode="${d.mailMode}"]`);}
    else if('mailSetup' in d)setup();
    else if('mailStart' in d){game=new RabbitPost(count,first,hard);soundtrack.start('mail');render();}
    else if(game&&!dialog.open){
      if('mailGuest' in d){game.invite(Number(d.mailGuest));privacy=true;effects.play([440,660],muted);}
      else if('mailReady' in d)privacy=false;
      else if('mailCard' in d&&!privacy){game.submit(Number(d.mailCard));privacy=true;effects.play([349,523],muted);}
      else if('mailVote' in d&&!privacy){game.vote(Number(d.mailVote));privacy=true;if(game.phase==='result')effects.play(game.hits>=2?[392,587,784]:[392,294],muted);}
      else if('mailNext' in d){game.next();privacy=true;}
      else return;
      render();
    }
  });
  setup();
}
