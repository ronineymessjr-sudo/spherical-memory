// PBR environment map. We try to load a real equirect HDR from
// `window.SM.envMapUrl` (if the user provided one). If that fails or no
// URL is set, we fall back to three's procedural RoomEnvironment. The
// resulting PMREM is applied to all shard materials so metal/aurora themes
// look right.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

let envTexture = null;
let pmrem = null;
let offTheme = null;
let offMood = null;
let initialized = false;
let activeSource = 'room';

function loadProcedural() {
  const renderer = window.SM?.modules?.render3d?.scene?.getRenderer?.();
  const scene = window.SM?.modules?.render3d?.scene?.getScene?.();
  if (!renderer || !scene) return null;
  disposeEnv();
  pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  envTexture = pmrem.fromScene(room, 0.04).texture;
  scene.environment = envTexture;
  room.dispose?.();
  activeSource = 'room';
  return envTexture;
}

function loadHdr(url) {
  const renderer = window.SM?.modules?.render3d?.scene?.getRenderer?.();
  const scene = window.SM?.modules?.render3d?.scene?.getScene?.();
  if (!renderer || !scene) return;
  const loader = new RGBELoader();
  loader.load(url, (hdrTexture) => {
    disposeEnv();
    pmrem = pmrem || new THREE.PMREMGenerator(renderer);
    envTexture = pmrem.fromEquirectangular(hdrTexture).texture;
    scene.environment = envTexture;
    hdrTexture.dispose?.();
    activeSource = 'hdr';
    applyToShards();
    window.SM.bus.emit('envmap:ready', { source: 'hdr', url });
  }, undefined, (err) => {
    console.warn('[env-map] failed to load HDR, falling back to RoomEnvironment:', err);
    loadProcedural();
    applyToShards();
  });
}

function disposeEnv() {
  if (!envTexture && !pmrem) return;
  const scene = window.SM?.modules?.render3d?.scene?.getScene?.();
  if (scene) scene.environment = null;
  envTexture?.dispose?.();
  pmrem?.dispose?.();
  envTexture = null;
  pmrem = null;
}

function applyToShards() {
  if (!envTexture) return;
  const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];
  shards.forEach((shard) => {
    if (shard.material) {
      shard.material.envMap = envTexture;
      shard.material.needsUpdate = true;
    }
  });
}

function init() {
  if (initialized) return;
  const url = window.SM?.envMapUrl;
  if (url) {
    loadHdr(url);
  } else {
    loadProcedural();
  }
  applyToShards();
  offTheme = window.SM.bus.on('theme:change', () => applyToShards());
  offMood = window.SM.bus.on('mood:change', () => applyToShards());
  window.SM.bus.on('shards:rebuilt', applyToShards);
  // Allow runtime override.
  window.SM.setEnvMapUrl = (url) => {
    window.SM.envMapUrl = url;
    if (url) loadHdr(url);
    else loadProcedural();
  };
  initialized = true;
}

function destroy() {
  offTheme?.();
  offMood?.();
  offTheme = null;
  offMood = null;
  disposeEnv();
  initialized = false;
}

export {
  init,
  destroy,
};
