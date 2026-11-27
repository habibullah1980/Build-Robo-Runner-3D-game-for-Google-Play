// Tiny synthesized sound effects (no audio files needed yet).
let ctx = null;
let master = null;
export let muted = false;

export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
  } catch (e) { ctx = null; }
}

export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.35; }

function tone({ f0, f1 = f0, dur = 0.12, type = 'sine', vol = 0.5, delay = 0 }) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur = 0.3, vol = 0.4) {
  if (!ctx || muted) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 900;
  s.buffer = buf; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(master); s.start();
}

let gearStep = 0;
export const sfx = {
  gear() { gearStep = (gearStep + 1) % 6; tone({ f0: 1200 + gearStep * 90, f1: 1800 + gearStep * 90, dur: 0.08, type: 'triangle', vol: 0.25 }); },
  jump() { tone({ f0: 300, f1: 700, dur: 0.18, type: 'square', vol: 0.12 }); },
  slide() { tone({ f0: 500, f1: 180, dur: 0.2, type: 'sawtooth', vol: 0.08 }); },
  lane() { tone({ f0: 420, f1: 520, dur: 0.06, type: 'triangle', vol: 0.12 }); },
  power() { [0, 0.07, 0.14, 0.21].forEach((d, i) => tone({ f0: 600 + i * 200, dur: 0.1, type: 'square', vol: 0.1, delay: d })); },
  stumble() { tone({ f0: 220, f1: 90, dur: 0.25, type: 'sawtooth', vol: 0.25 }); noise(0.15, 0.25); },
  crash() { noise(0.5, 0.6); tone({ f0: 160, f1: 40, dur: 0.6, type: 'sawtooth', vol: 0.35 }); },
  shield() { tone({ f0: 900, f1: 300, dur: 0.3, type: 'sine', vol: 0.3 }); },
};
