const familyThemes = {
  archeo: [280,'triangle',[45,48,50,52],[0,null,7,10,12,null,7,3,0,3,7,null,10,7,3,null]],
  flip7: [305,'sine',[43,48,45,50],[12,null,16,19,22,19,null,16,12,14,17,null,21,null,17,14]],
  prism: [265,'sine',[48,55,53,55],[12,16,null,19,24,21,19,null,17,21,null,24,19,16,14,null]],
  table: [320,'triangle',[48,53,50,55],[12,null,19,16,17,21,17,null,14,null,21,17,19,23,17,14]],
  mosaic: [355,'triangle',[48,50,45,43],[12,16,19,null,17,21,19,16,14,17,21,null,19,17,14,null]],
  athletes: [235,'triangle',[45,53,48,55],[12,12,19,21,null,17,21,24,16,19,24,null,26,24,19,null]],
  castle: [325,'triangle',[43,48,45,50],[7,12,16,null,12,17,21,null,9,12,16,19,14,17,19,null]],
  jungle: [240,'sine',[45,43,41,43],[12,null,15,19,null,17,14,null,12,17,null,15,14,19,null,14]],
  space: [340,'sine',[42,45,38,40],[12,null,19,null,21,24,null,null,14,null,21,17,19,null,24,null]],
  pirate: [265,'triangle',[45,40,45,43],[12,15,19,15,12,null,14,17,19,24,22,19,14,17,19,null]],
  snow: [385,'sine',[48,45,41,43],[19,24,null,21,17,19,null,16,14,17,21,null,19,null,14,null]],
  volcano: [255,'triangle',[41,42,45,43],[0,7,null,12,13,null,10,7,0,3,7,null,10,7,3,null]],
  candy: [295,'sine',[48,53,45,55],[24,19,16,19,21,17,12,null,16,19,24,22,21,19,17,null]],
  reef: [440,'sine',[38,43,41,45],[15,null,19,24,null,22,19,null,17,21,null,19,24,21,17,null]],
};

function familyMusic() {
  let audio, bus, timer, theme, muted = false, step = 0;
  const hz = note => 440 * 2 ** ((note-69)/12);
  function note(midi, duration, volume, type, when) {
    const voice = audio.createOscillator(), gain = audio.createGain();
    voice.type = type;
    voice.frequency.value = hz(midi);
    gain.gain.setValueAtTime(.001,when);
    gain.gain.linearRampToValueAtTime(volume,when+.027);
    gain.gain.exponentialRampToValueAtTime(.001,when+duration);
    voice.connect(gain).connect(bus);
    voice.start(when);
    voice.stop(when+duration+.01);
  }
  function pause() {
    clearInterval(timer);
    timer = undefined;
    bus?.disconnect();
    bus = undefined;
  }
  function play() {
    if (timer !== undefined || !theme || muted || !window.AudioContext) return;
    audio ??= new AudioContext();
    audio.resume().catch(() => {});
    bus = audio.createGain();
    bus.gain.value = .46;
    bus.connect(audio.destination);
    const [beat,type,bass,melody] = theme;
    const tick = () => {
      const when = audio.currentTime+.012;
      const pitch = melody[step%melody.length];
      if (pitch !== null) note(48+pitch,beat/315,.045,type,when);
      if (step%4===0) {
        note(bass[Math.floor(step/4)%bass.length]-12,beat/510,.052,'sine',when);
        note(bass[Math.floor(step/4)%bass.length]+7,beat/390,.019,'sine',when+.018);
      }
      if (step%4===2) note(36,.08,.024,'triangle',when);
      step++;
    };
    tick();
    timer = setInterval(tick,beat);
  }
  return {
    start(id) { pause(); theme=familyThemes[id]; step=0; play(); },
    mute(value) { muted=value; if (muted) pause(); else play(); },
    stop() { pause(); theme=undefined; },
    close() { pause(); theme=undefined; audio?.close().catch(() => {}); audio=undefined; },
  };
}
