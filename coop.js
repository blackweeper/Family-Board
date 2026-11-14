const coopModes = {
  little: { eggs:4, speed:1950, eggWidth:34, shieldWidth:18 },
  family: { eggs:5, speed:1580, eggWidth:28, shieldWidth:15 },
};
const coopFoxLimit = 5;
const coopIcon = kind => '<img src="./covers/coop-'+kind+'.png" alt="" draggable="false">';

function coopTargets(mode, progress, random = Math.random) {
  const { eggWidth, shieldWidth, speed } = coopModes[mode];
  const egg = { width:eggWidth * (1 - .19 * progress) };
  const shield = { width:shieldWidth * (1 - .18 * progress) };
  const free = 100 - egg.width - shield.width;
  const [first, last] = random() < .5 ? [egg, shield] : [shield, egg];
  first.start = free * (.22 + random() * .08);
  last.start = 100 - last.width - free * (.22 + random() * .08);
  return { egg, shield, speed:speed * (1 - .17 * progress) };
}

function coopOutcome(cursor, targets) {
  const contains = ({ start, width }) => cursor >= start && cursor <= start + width;
  if (contains(targets.egg)) return 'egg';
  if (contains(targets.shield)) return 'shield';
  return 'fox';
}

const coopRules = `
  <h2>Comment jouer ?</h2>
  <ol>
    <li>Appuie sur <strong>Lancer</strong> pour faire partir le curseur. Touche la jauge ou appuie sur <strong>Stop</strong> pour l’arrêter.</li>
    <li>Dans la zone dorée, l’œuf rejoint le nid éclairé. Dans la zone verte, un bouclier protège ce nid. Un nid peut avoir un seul bouclier.</li>
    <li>Si tu t’arrêtes dans la zone du renard, il avance et vole un œuf au nid éclairé s’il y en a un. Un bouclier bloque ce vol et disparaît.</li>
    <li>Plus il y a d’œufs à l’abri, plus le curseur accélère et plus les zones de récompense rétrécissent.</li>
    <li>Remplissez les trois nids avant que le renard ne fasse cinq pas. Le jeu passe la main automatiquement.</li>
  </ol>`;

function coopGame() {
  let count=2, mode='little', player=0, phase='setup', selected=0;
  let nests=[], fox=0, effect='', notice='', stolen=false;
  let targets, cursor=0, elapsed=0, lastFrame, frame, timer;
  let soundOn=true, audio, field, music, beat=0;
  const config=()=>coopModes[mode];
  const goal=()=>3*config().eggs;
  const total=()=>nests.reduce((sum,nest)=>sum+nest.eggs,0);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');

  app.innerHTML='<section class="coop"><div class="coop-bar">'+
    '<button class="secondary" id="back">← Jeux</button><button class="secondary" id="coop-sound" aria-pressed="true">🔊 Son</button>'+
    '<button class="secondary" id="coop-rules">? Règles</button></div><div id="coop-stage"></div>'+
    '<dialog class="coop-rules" aria-label="Règles de La Ronde du Poulailler">'+coopRules+    '<form method="dialog"><button class="primary">Compris !</button></form></dialog></section>';
  const stage=app.querySelector('#coop-stage');
  const rules=app.querySelector('.coop-rules');
  const rulesButton=app.querySelector('#coop-rules');
  const focus=selector=>stage.querySelector(selector)?.focus({preventScroll:true});

  function sound(notes, level=.095, type='sine') {
    if (!soundOn || !window.AudioContext) return;
    audio ??= new AudioContext();
    if (audio.state==='suspended') audio.resume().catch(()=>{});
    notes.forEach((pitch,index)=>{
      const start=audio.currentTime+index*.082;
      const tone=audio.createOscillator(), gain=audio.createGain();
      tone.type=type;
      tone.frequency.value=pitch;
      gain.gain.setValueAtTime(.001,start);
      gain.gain.exponentialRampToValueAtTime(level,start+.023);
      gain.gain.exponentialRampToValueAtTime(.001,start+.23);
      tone.connect(gain).connect(audio.destination);
      tone.start(start);
      tone.stop(start+.24);
    });
  }

  function startAmbience() {
    if (!soundOn || !window.AudioContext || field) return;
    audio ??= new AudioContext();
    audio.resume().catch(()=>{});
    const buffer=audio.createBuffer(1,audio.sampleRate*4,audio.sampleRate);
    const samples=buffer.getChannelData(0);
    let seed=73, breeze=0;
    for (let i=0;i<samples.length;i++) {
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      breeze=.955*breeze+(seed/4294967296-.5)*.09;
      samples[i]=breeze*Math.sin(Math.PI*i/samples.length)**2;
    }
    const source=audio.createBufferSource(), filter=audio.createBiquadFilter(), gain=audio.createGain();
    source.buffer=buffer;
    source.loop=true;
    filter.type='bandpass';
    filter.frequency.value=870;
    filter.Q.value=.65;
    gain.gain.value=.13;
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start();
    field=[source,filter,gain];
    const tune=[
      [196,392],[0,0],[0,466],[0,523],[147,587],[0,0],[0,523],[0,466],
      [175,440],[0,0],[0,523],[0,659],[131,587],[0,0],[0,466],[0,0],
    ];
    music=setInterval(()=>{
      if (audio.state!=='running'||document.hidden) return;
      const [bass, melody]=tune[beat%tune.length];
      if (bass) farmNote(bass,.032,.35,1);
      if (melody) farmNote(melody,.022,.21,.997);
      if (beat%16===5||beat%16===13) cluck();
      if (beat%16===2) {
        farmNote(1600,.012,.115,1.31,.06);
        farmNote(1910,.01,.1,.78,.21);
      }
      beat++;
    },302);
  }

  function farmNote(pitch, volume, length, sweep, delay=0, type='triangle') {
    const start=audio.currentTime+delay;
    const tone=audio.createOscillator(), envelope=audio.createGain();
    tone.type=type;
    tone.frequency.setValueAtTime(pitch,start);
    tone.frequency.exponentialRampToValueAtTime(pitch*sweep,start+length*.8);
    envelope.gain.setValueAtTime(.001,start);
    envelope.gain.exponentialRampToValueAtTime(volume,start+.012);
    envelope.gain.exponentialRampToValueAtTime(.001,start+length);
    tone.connect(envelope).connect(audio.destination);
    tone.start(start);
    tone.stop(start+length+.01);
  }

  function cluck() {
    for (const [delay,pitch,length] of [[0,625,.075],[.12,660,.08],[.25,725,.155]]) {
      farmNote(pitch,.038,length,.55,delay);
      farmNote(pitch*1.83,.009,length,.59,delay+.006,'sine');
    }
  }

  function stopAmbience() {
    clearInterval(music);
    if (!field) return;
    field[0].stop();
    field.forEach(node=>node.disconnect());
    field=undefined;
  }

  function setup() {
    phase='setup';
    rulesButton.disabled=false;
    stage.innerHTML='<div class="coop-intro"><div class="coop-intro-copy"><h1>La Ronde du<br>Poulailler</h1>'+
      '<p>Arrête le curseur sur l’œuf ou le bouclier.</p><fieldset><legend>Joueurs</legend><div class="coop-options">'+
      [1,2,3,4].map(n=>'<button data-count="'+n+'" aria-pressed="'+(count===n)+'">'+n+'</button>').join('')+
      '</div></fieldset><fieldset><legend>Mode</legend><div class="coop-options">'+
      '<button data-mode="little" aria-pressed="'+(mode==='little')+'">Petits</button>'+
      '<button data-mode="family" aria-pressed="'+(mode==='family')+'">Famille</button></div></fieldset>'+
      '<p class="coop-mode">'+goal()+' œufs à mettre à l’abri</p><button class="coop-primary" data-start>▶ Jouer</button></div></div>';
  }

  function start() {
    player=0;
    selected=0;
    nests=Array.from({length:3},()=>({eggs:0,shield:false}));
    fox=0;
    effect='';
    beat=0;
    ready();
    startAmbience();
    sound([392,523,659]);
    render();
    focus('[data-try]');
  }

  function ready() {
    phase='ready';
    effect='';
    cursor=0;
    targets=coopTargets(mode,total()/(goal()-1));
  }

  function nestMarkup(nest,i) {
    const capacity=config().eggs;
    const current=i===selected;
    const event=current ? effect : '';
    const shield=nest.shield||event==='blocked';
    return '<div class="coop-nest '+(nest.eggs===capacity?'full':'')+'" data-nest="'+i+
      '" data-active="'+current+'" data-effect="'+event+'" role="group" aria-label="Nid '+(i+1)+', '+
      nest.eggs+' œufs sur '+capacity+(nest.shield?', protégé':'')+'">'+
      '<span class="coop-eggs" aria-hidden="true">'+Array.from({length:capacity},(_,slot)=>
      '<span class="coop-egg '+(slot<nest.eggs?'filled ':'')+(event==='egg'&&slot===nest.eggs-1?'new':'')+
      '">'+coopIcon('egg')+'</span>').join('')+'</span>'+
      (shield?'<span class="coop-shield" aria-hidden="true">'+coopIcon('shield')+'</span>':'')+'</div>';
  }

  function render() {
    rulesButton.disabled=phase==='result';
    const mark = (kind, {start,width}) => '<span class="coop-zone" data-zone="'+kind+'" style="--start:'+start+
      '%;--size:'+width+'%">'+coopIcon(kind)+'</span>';
    const low=targets.egg.start<targets.shield.start?targets.egg:targets.shield;
    const high=low===targets.egg?targets.shield:targets.egg;
    const danger=[[0,low.start],[low.start+low.width,high.start],[high.start+high.width,100]];
    const bar='<button type="button" class="coop-rail" data-stop aria-label="Arrêter le curseur sur la jauge" '+(phase==='aim'?'':'disabled')+
      '><span class="coop-meter" aria-hidden="true" style="--cursor:'+cursor+
      '%">'+danger.map(([start,end])=>'<span class="coop-fox-icon" style="--start:'+start+'%;--size:'+(end-start)+'%">'+coopIcon('fox')+'</span>').join('')+
      mark('egg',targets.egg)+mark('shield',targets.shield)+
      '<span class="coop-cursor"></span></span></button>';
    const action=phase==='result'?
      '<div class="coop-feedback" data-effect="'+effect+'" aria-hidden="true">'+coopIcon(effect==='blocked'?'shield':effect)+
      '<span>'+(effect==='fox'?'×':effect==='blocked'?'✦':'✓')+'</span></div>':
      '<button class="coop-tap" '+(phase==='ready'?'data-try':'data-stop')+'><span aria-hidden="true">'+
      (phase==='ready'?'▶':'■')+'</span>'+ (phase==='ready'?'Lancer':'Stop')+'</button>';
    stage.innerHTML='<div class="coop-board" data-phase="'+phase+'" data-seat="'+player+'" data-count="'+count+
      '" style="--fox-step:'+49/coopFoxLimit+'cqw">'+
      '<div class="coop-hud"><strong class="coop-pill">'+(count===1?'Partie solo':'Joueur '+(player+1))+'</strong>'+
      '<strong class="coop-pill" aria-label="'+total()+' œufs sur '+goal()+'">🥚 '+total()+' / '+goal()+'</strong>'+
      '<div class="coop-track" aria-label="Renard : '+fox+' pas sur '+coopFoxLimit+'">'+coopIcon('fox')+
      Array.from({length:coopFoxLimit},(_,i)=>'<i class="'+(i<fox?'reached':'')+'"></i>').join('')+'</div></div>'+
      '<div class="coop-fox '+(effect==='fox'?'advancing':'')+'" style="--fox:'+(86-49*fox/coopFoxLimit)+'%" aria-hidden="true">'+
      coopIcon('fox')+'</div><div class="coop-nests" aria-label="Les trois nids">'+nests.map(nestMarkup).join('')+'</div>'+
      '<div class="coop-center"><div class="coop-timing">'+bar+action+
      '<p class="coop-status" role="status">'+(phase==='result'?notice:phase==='aim'?'Arrête le curseur sur l’œuf ou le bouclier.':'')+'</p></div></div></div>';
  }

  function aim() {
    elapsed=0;
    cursor=0;
    lastFrame=undefined;
    phase='aim';
    render();
    frame=requestAnimationFrame(moveCursor);
    focus('.coop-tap[data-stop]');
  }

  function moveCursor(time) {
    if (phase!=='aim'||rules.open||!stage.isConnected) return;
    if (lastFrame!==undefined) elapsed+=Math.min(50,time-lastFrame);
    lastFrame=time;
    const travel=(elapsed/targets.speed)%2;
    cursor=100*(travel<=1?travel:2-travel);
    stage.querySelector('.coop-meter').style.setProperty('--cursor',cursor+'%');
    frame=requestAnimationFrame(moveCursor);
  }

  function stopCursor() {
    cancelAnimationFrame(frame);
    const nest=nests[selected];
    const hit=coopOutcome(cursor,targets);
    stolen=false;
    if (hit==='egg') {
      nest.eggs++;
      effect='egg';
      notice=nest.eggs===config().eggs?'Nid rempli !':'Un œuf à l’abri !';
      sound([523,659,784]);
    } else if (hit==='shield') {
      notice=nest.shield?'Ce nid est déjà protégé !':'Nid protégé !';
      nest.shield=true;
      effect='shield';
      sound([440,587,740,880]);
    } else if (nest.shield) {
      nest.shield=false;
      effect='blocked';
      notice='Renard bloqué !';
      sound([440,587]);
    } else {
      fox++;
      effect='fox';
      stolen=nest.eggs>0;
      nest.eggs=Math.max(0,nest.eggs-1);
      notice=stolen?'Un œuf volé !':'Le renard avance !';
      sound([330,247,196]);
    }
    phase='result';
    render();
    if (stolen&&!reduced.matches) flyStolenEgg();
    timer=setTimeout(advance,1150);
  }

  function flyStolenEgg() {
    const origin=stage.querySelector('[data-nest="'+selected+'"]').getBoundingClientRect();
    const target=stage.querySelector('.coop-fox img').getBoundingClientRect();
    const egg=document.createElement('span');
    if (!egg.animate) return;
    egg.className='coop-stolen';
    egg.setAttribute('aria-hidden','true');
    egg.innerHTML=coopIcon('egg');
    const x=origin.x+origin.width*.5, y=origin.y+origin.height*.48;
    Object.assign(egg.style,{left:x+'px',top:y+'px'});
    stage.querySelector('.coop-board').append(egg);
    const dx=target.x+target.width*.08-x, dy=target.y+target.height*.57-y;
    egg.animate([
      {transform:'translate(-50%,-50%)'},
      {transform:'translate('+dx*.5+'px,'+(dy*.6-18)+'px) rotate(28deg)',offset:.55},
      {transform:'translate('+dx+'px,'+dy+'px) scale(.5)',opacity:0},
    ],{duration:860,easing:'ease-in-out',fill:'forwards'});
  }

  function advance() {
    if (total()===goal()||fox>=coopFoxLimit) {
      finish(fox<coopFoxLimit);
      return;
    }
    player=(player+1)%count;
    do { selected=(selected+1)%nests.length; } while (nests[selected].eggs===config().eggs);
    ready();
    render();
    focus('[data-try]');
  }

  function finish(won) {
    phase='finished';
    stopAmbience();
    rulesButton.disabled=false;
    if (won) sound([523,659,784,1047]);
    stage.innerHTML='<div class="coop-finish"><div class="coop-finale-art">'+coopIcon(won?'egg':'fox')+'</div>'+
      '<h1>'+(won?'Tous les nids sont remplis !':'Le renard a trouvé le poulailler !')+'</h1>'+
      '<p>'+total()+' / '+goal()+' œufs à l’abri</p><div class="coop-options">'+
      '<button class="coop-primary" data-start>↻ Rejouer</button><button class="secondary" data-setup>Réglages</button></div></div>';
    focus('[data-start]');
  }

  stage.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if (!button||button.disabled||rules.open) return;
    if (button.hasAttribute('data-start')) start();
    else if (button.hasAttribute('data-setup')) {
      setup();
      focus('[data-start]');
    } else if (button.dataset.count||button.dataset.mode) {
      if (button.dataset.count) count=Number(button.dataset.count);
      else mode=button.dataset.mode;
      setup();
      focus(button.dataset.count?'[data-count="'+count+'"]':'[data-mode="'+mode+'"]');
    } else if (phase==='ready'&&button.hasAttribute('data-try')) aim();
    else if (phase==='aim'&&button.hasAttribute('data-stop')) stopCursor();
  });

  rulesButton.onclick=()=>{
    cancelAnimationFrame(frame);
    rules.showModal();
  };
  rules.addEventListener('close',()=>{
    if (phase==='aim'&&stage.isConnected) {
      lastFrame=undefined;
      frame=requestAnimationFrame(moveCursor);
    }
  });
  app.querySelector('#coop-sound').onclick=event=>{
    soundOn=!soundOn;
    if (soundOn) {
      audio?.resume().catch(()=>{});
      if (phase!=='setup'&&phase!=='finished') startAmbience();
    } else {
      stopAmbience();
      audio?.suspend().catch(()=>{});
    }
    event.currentTarget.textContent=soundOn?'🔊 Son':'🔇 Son';
    event.currentTarget.setAttribute('aria-pressed',soundOn);
  };
  app.querySelector('#back').onclick=()=>{
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    stopAmbience();
    audio?.close().catch(()=>{});
    home('[data-detail="coop"]');
  };
  setup();
}
