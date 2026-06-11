// PBR environment map. Uses three's RoomEnvironment to procedurally build a
// cubemap so MeshPhysicalMaterial's clearcoat / transmission / metalness /
// iridescence look right. Re-applied to all shard materials when the theme
// changes so metal/aurora themes get the proper reflective look.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

let envTexture = null;
let pmrem = null;
let offTheme = null;
let offMood = null;
let initialized = false;

function ensureEnv() {
  if (envTexture) return envTexture;
  const renderer = window.SM?.modules?.render3d?.scene?.getRenderer?.();
  const scene = window.SM?.modules?.render3d?.scene?.getScene?.();
  if (!renderer || !scene) return null;

  pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  envTexture = pmrem.fromScene(room, 0.04).texture;
  scene.environment = envTexture;
  room.dispose?.();
  return envTexture;
}

function applyToShards() {
  const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];
  shards.forEach((shard) => {
    if (shard.material) {
      shard.material.envMap = envTexture;
      // envMapIntensity is already on the material (0.9). For aurora/metal we
      // want a punchier reflection; for film/glass we keep it gentler.
      shard.material.needsUpdate = true;
    }
  });
}

function init() {
  if (initialized) return;
  ensureEnv();
  applyToShards();
  offTheme = window.SM.bus.on('theme:change', () => applyToShards());
  offMood = window.SM.bus.on('mood:change', () => applyToShards());
  // Re-apply when shards are rebuilt.
  window.SM.bus.on('shards:rebuilt', applyToShards);
  initialized = true;
}

function destroy() {
  offTheme?.();
  offMood?.();
  offTheme = null;
  offMood = null;
  const scene = window.SM?.modules?.render3d?.scene?.getScene?.();
  if (scene && envTexture) scene.environment = null;
  envTexture?.dispose?.();
  pmrem?.dispose?.();
  envTexture = null;
  pmrem = null;
  initialized = false;
}

export {
  init,
  destroy,
};
