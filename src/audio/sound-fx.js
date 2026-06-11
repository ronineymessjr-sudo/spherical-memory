// Mood-aware ambient audio + BGM layer using Web Audio. No asset files —
// all synthesis happens in the browser. The BGM is intentionally a soft,
// melodic pulse so it reads as "underscore" rather than a track. The mood
// preset swaps scales, tempo, and oscillator mix.

let context = null;
let masterGain = null;
let noiseNode = null;
let noiseFilter = null;
let noiseGainNode = null;
let oscillatorA = null;
let oscillatorB = null;
let oscGainA = null;
let oscGainB = null;
let melodyOsc = null;
let melodyGain = null;
let bassOsc = null;
let bassGain = null;
let pulseInterval = 0;
let pulseStep = 0;
let started = false;
let offMood = null;
let currentScale = [];

const MOOD_PRESETS = {
  vivid: {
    // G major pentatonic + D
    scale: [392.0, 440.0, 493.88, 587.33, 659.25, 783.99],
    bpm: 96,
    oscFreqA: 392,
    oscFreqB: 587.33,
    oscMix: 0.05,
    noiseColor: 3200,
    noiseQ: 0.7,
    noiseMix: 0.07,
    melodyMix: 0.18,
    bassFreq: 146.83, // D3
  },
  wistful: {
    // A minor pentatonic
    scale: [220.0, 261.63, 293.66, 329.63, 392.0, 440.0],
    bpm: 64,
    oscFreqA: 220,
    oscFreqB: 329.63,
    oscMix: 0.06,
    noiseColor: 1800,
    noiseQ: 1.4,
    noiseMix: 0.05,
    melodyMix: 0.12,
    bassFreq: 110.0, // A2
  },
  healing: {
    // C major pentatonic
    scale: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25],
    bpm: 72,
    oscFreqA: 261.63,
    oscFreqB: 392.0,
    oscMix: 0.06,
    noiseColor: 2400,
    noiseQ: 1.0,
    noiseMix: 0.06,
    melodyMix: 0.14,
    bassFreq: 130.81, // C3
  },
};

function ensureContext() {
  if (context) return context;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  context = new Ctx();
  masterGain = context.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(context.destination);
  return context;
}

function buildNoise() {
  if (!context) return;
  const bufferSize = 2 * context.sampleRate;
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) data[i] = Math.random() * 2 - 1;

  noiseNode = context.createBufferSource();
  noiseNode.buffer = buffer;
  noiseNode.loop = true;
  noiseFilter = context.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 1800;
  noiseFilter.Q.value = 1;
  noiseGainNode = context.createGain();
  noiseGainNode.gain.value = 0;
  noiseNode.connect(noiseFilter).connect(noiseGainNode).connect(masterGain);
  noiseNode.start();
}

function buildOscillators() {
  if (!context) return;
  oscillatorA = context.createOscillator();
  oscillatorA.type = 'sine';
  oscillatorA.frequency.value = 220;
  oscGainA = context.createGain();
  oscGainA.gain.value = 0;
  oscillatorA.connect(oscGainA).connect(masterGain);
  oscillatorA.start();

  oscillatorB = context.createOscillator();
  oscillatorB.type = 'sine';
  oscillatorB.frequency.value = 329;
  oscGainB = context.createGain();
  oscGainB.gain.value = 0;
  oscillatorB.detune.value = 6;
  oscillatorB.connect(oscGainB).connect(masterGain);
  oscillatorB.start();

  // Melody voice — short percussive pluck on the beat.
  melodyOsc = context.createOscillator();
  melodyOsc.type = 'triangle';
  melodyOsc.frequency.value = 0; // muted until pulse
  melodyGain = context.createGain();
  melodyGain.gain.value = 0;
  melodyOsc.connect(melodyGain).connect(masterGain);
  melodyOsc.start();

  // Bass drone — slow oscillator for body.
  bassOsc = context.createOscillator();
  bassOsc.type = 'sine';
  bassOsc.frequency.value = 110;
  bassGain = context.createGain();
  bassGain.gain.value = 0;
  bassOsc.connect(bassGain).connect(masterGain);
  bassOsc.start();
}

function startPulse(bpm, scale) {
  if (pulseInterval) {
    window.clearInterval(pulseInterval);
    pulseInterval = 0;
  }
  if (!context || !melodyOsc) return;
  const stepMs = Math.max(80, Math.round(60000 / bpm / 2)); // eighth notes
  pulseStep = 0;
  pulseInterval = window.setInterval(() => {
    if (!context || !melodyOsc) return;
    const note = scale[pulseStep % scale.length];
    const octave = (pulseStep % 16) < 8 ? 1 : 0.5; // every 8th step dips an octave
    const freq = note * octave;
    const now = context.currentTime;
    melodyOsc.frequency.cancelScheduledValues(now);
    melodyOsc.frequency.setValueAtTime(freq, now);
    melodyOsc.frequency.exponentialRampToValueAtTime(freq * 0.96, now + 0.18);
    if (melodyGain) {
      melodyGain.gain.cancelScheduledValues(now);
      melodyGain.gain.setValueAtTime(0, now);
      melodyGain.gain.linearRampToValueAtTime(0.4, now + 0.01);
      melodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    }
    pulseStep += 1;
  }, stepMs);
}

function stopPulse() {
  if (pulseInterval) {
    window.clearInterval(pulseInterval);
    pulseInterval = 0;
  }
}

function applyPreset(name) {
  const preset = MOOD_PRESETS[name] ?? MOOD_PRESETS.wistful;
  if (!context) return;
  currentScale = preset.scale.slice();
  const now = context.currentTime;
  if (noiseFilter) {
    noiseFilter.frequency.setTargetAtTime(preset.noiseColor, now, 0.4);
    noiseFilter.Q.setTargetAtTime(preset.noiseQ, now, 0.4);
    if (noiseGainNode) noiseGainNode.gain.setTargetAtTime(preset.noiseMix, now, 0.4);
  }
  if (oscillatorA) oscillatorA.frequency.setTargetAtTime(preset.oscFreqA, now, 0.4);
  if (oscillatorB) oscillatorB.frequency.setTargetAtTime(preset.oscFreqB, now, 0.4);
  if (oscGainA) oscGainA.gain.setTargetAtTime(preset.oscMix, now, 0.4);
  if (oscGainB) oscGainB.gain.setTargetAtTime(preset.oscMix * 0.7, now, 0.4);
  if (bassOsc) bassOsc.frequency.setTargetAtTime(preset.bassFreq, now, 0.4);
  if (bassGain) bassGain.gain.setTargetAtTime(preset.melodyMix * 0.6, now, 0.4);
  if (melodyGain) melodyGain.gain.setTargetAtTime(preset.melodyMix, now, 0.4);
  if (started) startPulse(preset.bpm, preset.scale);
}

function start() {
  if (started) return;
  const ctx = ensureContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  buildNoise();
  buildOscillators();
  applyPreset('wistful');
  const now = ctx.currentTime;
  masterGain.gain.setTargetAtTime(0.18, now, 1.2);
  started = true;
}

function stop() {
  if (!started || !context) return;
  const now = context.currentTime;
  masterGain.gain.setTargetAtTime(0, now, 0.6);
  stopPulse();
  window.setTimeout(() => {
    try { noiseNode?.stop(); } catch {}
    try { oscillatorA?.stop(); } catch {}
    try { oscillatorB?.stop(); } catch {}
    try { melodyOsc?.stop(); } catch {}
    try { bassOsc?.stop(); } catch {}
    noiseNode = null;
    oscillatorA = null;
    oscillatorB = null;
    melodyOsc = null;
    bassOsc = null;
    started = false;
  }, 700);
}

function init() {
  // Browsers require a user gesture before resuming audio. Hook into the first
  // pointerdown to start.
  const startOnFirstTap = () => {
    start();
    document.removeEventListener('pointerdown', startOnFirstTap, true);
  };
  document.addEventListener('pointerdown', startOnFirstTap, true);

  offMood = window.SM.bus.on('mood:change', ({ name }) => {
    if (started) applyPreset(name);
  });
}

function destroy() {
  offMood?.();
  offMood = null;
  stop();
}

export {
  init,
  destroy,
  start,
  stop,
  applyPreset,
  MOOD_PRESETS,
};
