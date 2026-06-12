// Shockwave: a single propagating wave that displaces every shard's
// vertices along their outward normal. Triggered by the mirror fracture
// moment. Lives for ~1.2s and is consumed by `applyShockwave` in
// shard-mesh.js (CPU side, applied per-frame to the carved BufferGeometry).
//
// Visual: imagine a glass sphere being hit by an invisible punch — every
// shard flexes outward, then settles.

import * as THREE from 'three';

const SHOCKWAVE_SPEED = 2.4; // units / sec
const SHOCKWAVE_WIDTH = 0.55; // peak width in "distance from epicenter"
const SHOCKWAVE_LIFETIME = 1.2; // sec
const SHOCKWAVE_AMPLITUDE = 0.18; // peak displacement (world units)

let activeShockwave = null;
let offTrigger = null;
let offRebuilt = null;

function startShockwave(epicenter) {
  if (!epicenter) {
    const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];
    if (!shards.length) return;
    // Use the average direction of all shards as the synthetic epicenter so
    // the wave is symmetric even if we don't know which point was hit.
    let cx = 0, cy = 0, cz = 0;
    shards.forEach((s) => { cx += s.direction.x; cy += s.direction.y; cz += s.direction.z; });
    const n = shards.length || 1;
    epicenter = new THREE.Vector3(cx / n, cy / n, cz / n);
  }
  activeShockwave = {
    epicenter: epicenter.clone().normalize(),
    startedAt: performance.now() * 0.001,
  };
}

function consume() {
  const sw = activeShockwave;
  activeShockwave = null;
  return sw;
}

function init() {
  // Trigger from the aggregate choreography right when the mirror burst
  // moment happens (before particles start).
  offTrigger = window.SM.bus.on('crack:explode', (payload) => {
    startShockwave(payload?.epicenter);
  });
  // Cancel on shards rebuild so we don't keep displacing stale geometry.
  offRebuilt = window.SM.bus.on('shards:rebuilt', () => {
    activeShockwave = null;
  });
}

function destroy() {
  offTrigger?.();
  offRebuilt?.();
  offTrigger = null;
  offRebuilt = null;
  activeShockwave = null;
}

function getActive() {
  return activeShockwave;
}

export {
  init,
  destroy,
  startShockwave,
  consume,
  getActive,
  SHOCKWAVE_SPEED,
  SHOCKWAVE_WIDTH,
  SHOCKWAVE_LIFETIME,
  SHOCKWAVE_AMPLITUDE,
};
