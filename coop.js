const coopModes = {
  little: { eggs:4, speed:1720, width:34 },
  family: { eggs:5, speed:1390, width:29 },
};
const coopFoxLimit = 5;
const coopIcon = kind => '<img src="./covers/coop-'+kind+'.png" alt="" draggable="false">';

const coopRules = `
  <h2>Comment jouer ?</h2>
  <ol>
    <li>À ton tour, touche l’œuf ou le bouclier. Le nid concerné s’allume.</li>
    <li>Quand le curseur passe dans le vert, touche <strong>Stop</strong>. Le bouclier a une zone verte beaucoup plus petite.</li>
    <li>Une réussite ajoute un œuf ou un bouclier au nid. Plus les nids se remplissent, plus le curseur accélère et plus la zone verte rétrécit.</li>
    <li>Si tu rates, le renard avance et vole un œuf au nid éclairé s’il y en a un. Un bouclier disparaît en bloquant le renard.</li>
    <li>Remplissez les trois nids avant que le renard ne fasse cinq pas. Le jeu passe la main automatiquement.</li>
  </ol>`;

function coopGame() {
  let count=2, mode='little', player=0, phase='setup', selected=0;
  let nests=[], fox=0, effect='', reward='', notice='', stolen=false;
  let left=0, width=0, speed=0, cursor=0, elapsed=0, lastFrame, frame, timer;
  let soundOn=true, audio, wind, music, beat=0;
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
    if (!soundOn || !window.AudioContext || wind) return;
    audio ??= new AudioContext();
    audio.resume().catch(()=>{});
    const buffer=audio.createBuffer(1,audio.sampleRate*3,audio.sampleRate);
    const samples=buffer.getChannelData(0);
    for (let i=1;i<samples.length;i++) samples[i]=samples[i-1]*.94+(Math.random()-.5)*.12;
    const source=audio.createBufferSource(), filter=audio.createBiquadFilter(), gain=audio.createGain();
    source.buffer=buffer;
    source.loop=true;
    filter.type='lowpass';
    filter.frequency.value=410;
    gain.gain.value=.23;
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start();
    wind=[source,filter,gain];
    const notes=[147,0,175,0,196,147,0,165,0,131,0,165];
    music=setInterval(()=>{
      if (audio.state!=='running') return;
      const pitch=notes[beat%notes.length];
      if (pitch) sound([pitch],.035,'triangle');
      if (beat%12===7) cluck();
      if (beat%12===2) sound([1560,1760],.014);
      beat++;
    },380);
  }

  function cluck() {
    for (const [delay,pitch] of [[0,320],[.15,420],[.28,300]]) {
      const start=audio.currentTime+delay;
      const tone=audio.createOscillator(), gain=audio.createGain();
      tone.type='triangle';
      tone.frequency.setValueAtTime(pitch,start);
      tone.frequency.exponentialRampToValueAtTime(pitch*.63,start+.085);
      gain.gain.setValueAtTime(.001,start);
      gain.gain.exponentialRampToValueAtTime(.05,start+.014);
      gain.gain.exponentialRampToValueAtTime(.001,start+.105);
      tone.connect(gain).connect(audio.destination);
      tone.start(start);
      tone.stop(start+.11);
    }
  }

  function stopAmbience() {
    clearInterval(music);
    if (!wind) return;
    wind[0].stop();
    wind.forEach(node=>node.disconnect());
    wind=undefined;
  }

  function setup() {
    phase='setup';
    rulesButton.disabled=false;
    stage.innerHTML='<div class="coop-intro"><div class="coop-intro-copy"><h1>La Ronde du<br>Poulailler</h1>'+
      '<p>Arrête le curseur dans le vert pour protéger les œufs.</p><fieldset><legend>Joueurs</legend><div class="coop-options">'+
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
    reward='';
    beat=0;
    phase='ready';
    startAmbience();
    sound([392,523,659]);
    render();
    focus('[data-try]');
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
    const angle=(count===2?[0,180]:[0,-90,180,90])[player];
    rulesButton.disabled=phase==='result';
    const bar=phase==='ready'?'':'<div class="coop-meter" aria-hidden="true" style="--left:'+left+'%;--width:'+width+'%;--cursor:'+cursor+'%"><span class="coop-green"></span><span class="coop-cursor"></span></div>';
    const action=phase==='ready'?
      '<div class="coop-choices"><button class="coop-choice" data-try="egg" aria-label="Gagner un œuf">'+coopIcon('egg')+'</button>'+
      '<button class="coop-choice" data-try="shield" aria-label="Gagner un bouclier, défi difficile" '+(nests[selected].shield?'disabled':'')+'>'+coopIcon('shield')+'</button></div>':
      phase==='aim'?'<button class="coop-primary coop-stop" data-stop>'+coopIcon(reward)+'<span>Stop</span></button>':
      '<div class="coop-feedback" data-effect="'+effect+'" aria-hidden="true">'+coopIcon(effect==='blocked'?'shield':effect)+
      '<span>'+(effect==='fox'?'×':effect==='blocked'?'✦':'✓')+'</span></div>';
    stage.innerHTML='<div class="coop-board" data-phase="'+phase+'" data-seat="'+player+'" data-count="'+count+
      '" style="--seat-angle:'+angle+'deg;--fox-step:'+49/coopFoxLimit+'cqw">'+
      '<div class="coop-hud"><strong class="coop-pill">'+(count===1?'Partie solo':'Joueur '+(player+1))+'</strong>'+
      '<strong class="coop-pill" aria-label="'+total()+' œufs sur '+goal()+'">🥚 '+total()+' / '+goal()+'</strong>'+
      '<div class="coop-track" aria-label="Renard : '+fox+' pas sur '+coopFoxLimit+'">'+coopIcon('fox')+
      Array.from({length:coopFoxLimit},(_,i)=>'<i class="'+(i<fox?'reached':'')+'"></i>').join('')+'</div></div>'+
      '<div class="coop-fox '+(effect==='fox'?'advancing':'')+'" style="--fox:'+(86-49*fox/coopFoxLimit)+'%" aria-hidden="true">'+
      coopIcon('fox')+'</div><div class="coop-nests" aria-label="Les trois nids">'+nests.map(nestMarkup).join('')+'</div>'+
      '<div class="coop-center"><div class="coop-timing">'+bar+action+
      '<p class="coop-status" role="status">'+(phase==='result'?notice:phase==='aim'?'Arrête le curseur dans le vert.':'')+'</p></div></div></div>';
  }

  function aim(kind) {
    reward=kind;
    const progress=total()/(goal()-1);
    width=config().width*(1-.35*progress)*(kind==='shield'?.37:1);
    speed=config().speed*(1-.34*progress);
    left=19+Math.random()*(64-width);
    elapsed=0;
    cursor=0;
    lastFrame=undefined;
    phase='aim';
    render();
    frame=requestAnimationFrame(moveCursor);
    focus('[data-stop]');
  }

  function moveCursor(time) {
    if (phase!=='aim'||rules.open||!stage.isConnected) return;
    if (lastFrame!==undefined) elapsed+=Math.min(50,time-lastFrame);
    lastFrame=time;
    const travel=(elapsed/speed)%2;
    cursor=100*(travel<=1?travel:2-travel);
    stage.querySelector('.coop-meter').style.setProperty('--cursor',cursor+'%');
    frame=requestAnimationFrame(moveCursor);
  }

  function stopCursor() {
    cancelAnimationFrame(frame);
    const nest=nests[selected];
    const hit=cursor>=left&&cursor<=left+width;
    stolen=false;
    if (hit&&reward==='egg') {
      nest.eggs++;
      effect='egg';
      notice=nest.eggs===config().eggs?'Nid rempli !':'Un œuf à l’abri !';
      sound([523,659,784]);
    } else if (hit) {
      nest.shield=true;
      effect='shield';
      notice='Nid protégé !';
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
    const oldAngle=parseFloat(getComputedStyle(stage.querySelector('.coop-center')).rotate)||0;
    player=(player+1)%count;
    do { selected=(selected+1)%nests.length; } while (nests[selected].eggs===config().eggs);
    phase='ready';
    effect='';
    reward='';
    render();
    const controls=stage.querySelector('.coop-center');
    const nextAngle=parseFloat(getComputedStyle(controls).rotate)||0;
    if (oldAngle!==nextAngle&&!reduced.matches&&controls.animate) {
      const offset=(oldAngle-nextAngle+540)%360-180;
      controls.animate([{rotate:nextAngle+offset+'deg'},{rotate:nextAngle+'deg'}],{duration:310,easing:'ease-out'});
    }
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
    } else if (phase==='ready'&&button.dataset.try) aim(button.dataset.try);
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
