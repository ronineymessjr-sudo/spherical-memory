// Subtle "breathing" of the sphere — a slow sinusoidal scale on the root
// group so the whole installation feels alive. Frequency tracks the current
// mood: vivid = fastest, healing = slowest, wistful = in between.

let frameId = 0;
let offMood = null;
let mood = 'wistful';

const MOOD_PULSE = {
  vivid: 0.85,    // ~83 bpm
  wistful: 0.42,  // ~40 bpm, very slow
  healing: 0.32,  // ~30 bpm, slowest
};

function tick() {
  frameId = window.requestAnimationFrame(tick);
  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (!root) return;
  const now = performance.now() * 0.001;
  const omega = MOOD_PULSE[mood] ?? MOOD_PULSE.wistful;
  const pulse = 1 + Math.sin(now * omega * 2 * Math.PI) * 0.012; // ±1.2%
  root.scale.setScalar(pulse);
}

function init() {
  if (frameId) return;
  tick();
  offMood = window.SM.bus.on('mood:change', ({ name }) => {
    if (name) mood = name;
  });
}

function destroy() {
  if (frameId) window.cancelAnimationFrame(frameId);
  frameId = 0;
  offMood?.();
  offMood = null;
  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (root) root.scale.setScalar(1);
}

export {
  init,
  destroy,
};
