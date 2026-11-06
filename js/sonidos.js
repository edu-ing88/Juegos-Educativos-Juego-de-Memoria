/* sonidos.js — Efectos con Web Audio API (sin archivos externos) */
const Sonidos = (() => {
  let ctx, on = localStorage.getItem('memoria_sonido') !== '0';
  const audio = () => ctx || (ctx = new (window.AudioContext || window.webkitAudioContext)());
  function nota(f, d, tipo = 'sine', retraso = 0, vol = .2) {
    if (!on) return;
    const x = audio(); if (x.state === 'suspended') x.resume();
    const o = x.createOscillator(), g = x.createGain(), t = x.currentTime + retraso;
    o.type = tipo; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g).connect(x.destination); o.start(t); o.stop(t + d + .05);
  }
  return {
    voltear: () => { nota(520, .08, 'triangle'); nota(780, .06, 'triangle', .05); },
    acierto: () => [523, 659, 784].forEach((f, i) => nota(f, .25, 'sine', i * .1)),
    error:   () => { nota(220, .18, 'sawtooth', 0, .12); nota(165, .25, 'sawtooth', .15, .12); },
    victoria:() => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => nota(f, .3, 'triangle', i * .14)),
    tick:    () => nota(660, .1, 'square', 0, .08),
    activo:  () => on,
    alternar:() => { on = !on; localStorage.setItem('memoria_sonido', on ? '1' : '0'); return on; }
  };
})();
