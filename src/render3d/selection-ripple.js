// Selection ripple: when a shard is focused, a thin ring expands outward
// from the shard's center across its surface, fading as it grows. Two
// rings per focus event (staggered) for a more continuous feel.

import * as THREE from 'three';

const RING_LIFETIME = 1400; // ms per ring
const RING_RADIUS_MAX = 1.4; // in shard-local radius units
const RING_COUNT = 2;
const STAGGER = 350; // ms between rings

let ringScene = null;
let rings = []; // { mesh, mat, bornAt, baseScale }
let frameId = 0;
let activeShardId = null;
let lastSpawnAt = 0;
let offFocus = null;
let offBlur = null;

function ensureScene() {
  if (ringScene) return ringScene;
  // We parent to the same root group as the shards so rings inherit the
  // sphere rotation.
  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (!root) return null;
  ringScene = new THREE.Group();
  ringScene.name = 'selection-ripples';
  root.add(ringScene);
  return ringScene;
}

function makeRingMaterial(color = '#ffe28f') {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

function spawnRing(shard) {
  if (!ringScene) return;
  const geometry = new THREE.RingGeometry(0.001, 0.018, 48, 1);
  const mat = makeRingMaterial();
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.copy(shard.direction).multiplyScalar(0.05);
  mesh.lookAt(shard.direction.clone().multiplyScalar(2));
  // Tag the mesh with the shard direction so we can update it if the
  // shard animates.
  mesh.userData.shardId = shard.id;
  mesh.userData.direction = shard.direction.clone();
  ringScene.add(mesh);
  rings.push({ mesh, mat, bornAt: performance.now() });
}

function update() {
  frameId = window.requestAnimationFrame(update);
  if (!ringScene) return;
  const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];

  // Spawn new rings while a shard is active. We stagger the spawns so the
  // user always sees ~RING_COUNT rings expanding.
  if (activeShardId) {
    const shard = shards.find((s) => s.id === activeShardId);
    const now = performance.now();
    if (shard && now - lastSpawnAt > STAGGER) {
      spawnRing(shard);
      lastSpawnAt = now;
    }
  }

  // Update + cull rings.
  const live = [];
  for (const ring of rings) {
    const age = performance.now() - ring.bornAt;
    if (age > RING_LIFETIME) {
      ring.mesh.geometry.dispose();
      ring.mat.dispose();
      ringScene.remove(ring.mesh);
      continue;
    }
    const t = age / RING_LIFETIME;
    const scale = t * RING_RADIUS_MAX;
    ring.mesh.scale.set(scale, scale, scale);
    ring.mat.opacity = (1 - t) * 0.7;
    // Re-anchor to the shard so it tracks rotation / arrangement.
    const shard = shards.find((s) => s.id === ring.mesh.userData.shardId);
    if (shard) {
      ring.mesh.position.copy(shard.mesh.position)
        .addScaledVector(ring.mesh.userData.direction, 0.05);
      ring.mesh.quaternion.copy(shard.mesh.quaternion);
    }
    live.push(ring);
  }
  rings = live;
}

function startFor(shardId) {
  activeShardId = shardId;
  lastSpawnAt = 0; // force immediate spawn
}

function stop() {
  activeShardId = null;
}

function init() {
  ensureScene();
  if (!frameId) frameId = window.requestAnimationFrame(update);
  offFocus = window.SM.bus.on('shard:focus', ({ shardId }) => {
    if (shardId) startFor(shardId);
  });
  offBlur = window.SM.bus.on('shard:blur', () => stop());
}

function destroy() {
  offFocus?.();
  offBlur?.();
  offFocus = null;
  offBlur = null;
  if (frameId) {
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  }
  rings.forEach((r) => {
    r.mesh.geometry.dispose();
    r.mat.dispose();
  });
  rings = [];
  ringScene?.parent?.remove?.(ringScene);
  ringScene = null;
  activeShardId = null;
}

export {
  init,
  destroy,
};
