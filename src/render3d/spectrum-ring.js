// Audio-reactive spectrum ring: 64 vertical bars arranged in a circle
// around the sphere. Each bar's height is driven by the FFT bin at the
// same index. The same FFT is bucketed into 4 frequency bands (low /
// mid-low / mid-high / high) and the average amplitude of each band is
// pushed to the active shard's emissive color so the sphere glows in
// response to the music.

import * as THREE from 'three';

const BAR_COUNT = 64;
const RING_RADIUS = 3.2;
const MAX_HEIGHT = 0.7;
const MIN_HEIGHT = 0.04;

const BANDS = [
  { name: 'low',      start: 0,  end: 8,  color: new THREE.Color('#ff5c4d') },
  { name: 'midLow',   start: 8,  end: 22, color: new THREE.Color('#ffb27a') },
  { name: 'midHigh',  start: 22, end: 40, color: new THREE.Color('#a5b6ff') },
  { name: 'high',     start: 40, end: 64, color: new THREE.Color('#9ed5ff') },
];

let group = null;
let bars = [];
let frameId = 0;
let freqData = null;
let offMood = null;
let mood = 'wistful';
let bandAmplitudes = [0, 0, 0, 0];

const MOOD_TINT = {
  vivid: new THREE.Color('#ff8d6a'),
  wistful: new THREE.Color('#8fd6ff'),
  healing: new THREE.Color('#5ee2c2'),
};

function ensureGroup() {
  if (group) return group;
  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (!root) return null;
  group = new THREE.Group();
  group.name = 'spectrum-ring';
  root.add(group);
  group.rotation.x = -0.18;
  for (let i = 0; i < BAR_COUNT; i += 1) {
    const geo = new THREE.BoxGeometry(0.04, 1, 0.04);
    const mat = new THREE.MeshBasicMaterial({
      color: MOOD_TINT[mood].clone(),
      transparent: true,
      opacity: 0.65,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const angle = (i / BAR_COUNT) * Math.PI * 2;
    mesh.position.set(
      Math.cos(angle) * RING_RADIUS,
      0,
      Math.sin(angle) * RING_RADIUS,
    );
    geo.translate(0, 0.5, 0);
    mesh.scale.y = MIN_HEIGHT;
    group.add(mesh);
    bars.push({ mesh, mat });
  }
  return group;
}

function readSpectrum() {
  const soundFx = window.SM?.modules?.audio?.soundFx;
  if (!soundFx) return;
  const data = soundFx.getFrequencyData?.();
  if (!data) return;
  freqData = data;
}

function computeBands() {
  if (!freqData) {
    bandAmplitudes = [0, 0, 0, 0];
    return;
  }
  for (let b = 0; b < BANDS.length; b += 1) {
    const band = BANDS[b];
    let sum = 0;
    const count = Math.max(1, band.end - band.start);
    for (let i = band.start; i < band.end && i < freqData.length; i += 1) {
      sum += freqData[i] || 0;
    }
    const target = (sum / count) / 255;
    bandAmplitudes[b] = THREE.MathUtils.lerp(bandAmplitudes[b], target, 0.4);
  }
}

function applyBandsToShards() {
  const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];
  if (!shards.length) return;
  // Cycle through the shards so the emissive walks the sphere.
  shards.forEach((shard, idx) => {
    if (!shard.material?.emissive) return;
    const band = BANDS[idx % BANDS.length];
    const amp = bandAmplitudes[idx % BANDS.length];
    // Mix between the shard's existing mood emissive and the band tint.
    const baseEmissive = shard.material.userData?.palette?.emissive
      ? new THREE.Color(shard.material.userData.palette.emissive)
      : new THREE.Color('#0f1c32');
    const tinted = baseEmissive.clone().lerp(band.color, amp * 0.7);
    shard.material.emissive = tinted;
    const base = shard.material.userData?.baseEmissiveIntensity ?? 0.16;
    shard.material.emissiveIntensity = base + amp * 0.8;
  });
}

function update() {
  frameId = window.requestAnimationFrame(update);
  if (!bars.length) return;
  readSpectrum();
  for (let i = 0; i < bars.length; i += 1) {
    const target = freqData ? (freqData[i] || 0) / 255 : 0;
    const bar = bars[i];
    const current = bar.mesh.scale.y;
    const next = THREE.MathUtils.lerp(current, MIN_HEIGHT + target * MAX_HEIGHT, 0.4);
    bar.mesh.scale.y = next;
    bar.mat.opacity = 0.45 + target * 0.45;
  }
  computeBands();
  applyBandsToShards();
}

function setMood(name) {
  if (!name || !MOOD_TINT[name]) return;
  mood = name;
  bars.forEach((b) => {
    b.mat.color.copy(MOOD_TINT[name]);
  });
}

function init() {
  ensureGroup();
  if (!frameId) frameId = window.requestAnimationFrame(update);
  offMood = window.SM.bus.on('mood:change', ({ name }) => setMood(name));
}

function destroy() {
  offMood?.();
  offMood = null;
  if (frameId) {
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  }
  bars.forEach((b) => {
    b.mesh.geometry.dispose();
    b.mat.dispose();
  });
  bars = [];
  group?.parent?.remove?.(group);
  group = null;
}

export {
  init,
  destroy,
  setMood,
};

