function partyConfetti() {
  return '<div class="party-confetti" aria-hidden="true">'+Array.from({length:24},(_,i)=>`<i style="--x:${i*100/24}%;--delay:${i%6*70}ms"></i>`).join('')+'</div>';
}

function partyMute(button,soundtrack,muted) {
  soundtrack.mute(muted);
  button.textContent=muted?'🔇 Son':'♪ Son';
  button.setAttribute('aria-pressed',!muted);
}

function partyEffects() {
  let context;
  return {
    play(notes, muted) {
      if (muted || !window.AudioContext) return;
      context ??= new AudioContext();
      context.resume().catch(() => {});
      const time = context.currentTime;
      notes.forEach((frequency, index) => {
        const start = time + index * .069;
        const tone = context.createOscillator();
        const gain = context.createGain();
        tone.type = 'triangle';
        tone.frequency.setValueAtTime(frequency,start);
        tone.frequency.exponentialRampToValueAtTime(frequency*.72,start+.21);
        gain.gain.setValueAtTime(.001,start);
        gain.gain.linearRampToValueAtTime(.085,start+.019);
        gain.gain.exponentialRampToValueAtTime(.001,start+.23);
        tone.connect(gain).connect(context.destination);
        tone.start(start);
        tone.stop(start+.24);
      });
    },
    close() { context?.close().catch(() => {}); context=undefined; },
  };
}
