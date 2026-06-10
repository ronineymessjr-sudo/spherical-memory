import * as THREE from 'three';

const PRESET_MATERIALS = Array.from({ length: 6 }, (_, index) => ({
  id: `preset-${index + 1}`,
  type: 'panorama',
  url: `./assets/fallback/memory-0${index + 1}.svg`,
  isPanorama: true,
}));

let textureLoader = null;
let offReady = null;

function getLoader() {
  if (!textureLoader) textureLoader = new THREE.TextureLoader();
  return textureLoader;
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    getLoader().load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

async function bind(materials, shards) {
  const safeMaterials = materials?.length ? materials : PRESET_MATERIALS;
  window.SM.materials = safeMaterials;

  await Promise.all(shards.map(async (shard, index) => {
    const config = safeMaterials[index % safeMaterials.length];
    const texture = await loadTexture(config.url);
    shard.material.map = texture;
    shard.material.needsUpdate = true;
  }));
}

async function ensureBindings() {
  const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];
  if (!shards.length) return;
  await bind(PRESET_MATERIALS, shards);
}

async function swapTo(shardId, animate = true) {
  const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];

  shards.forEach((shard) => {
    const isActive = shard.id === shardId;
    shard.material.emissive = new THREE.Color(isActive ? '#8fd6ff' : '#000000');
    shard.material.emissiveIntensity = isActive ? 0.65 : 0;
  });

  if (animate) {
    window.SM.modules.render3d.shardMesh?.rotateBy?.(0.08, -0.04);
  }
}

async function resetView() {
  const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];
  shards.forEach((shard) => {
    shard.material.emissive = new THREE.Color('#000000');
    shard.material.emissiveIntensity = 0;
  });
}

function init() {
  offReady = window.SM?.bus?.once?.('app:ready', () => {
    ensureBindings().catch((error) => {
      console.warn('[panoramaBind] preset texture bind failed:', error?.message || error);
    });
  }) ?? null;
}

function destroy() {
  offReady?.();
  offReady = null;
}

export {
  init,
  destroy,
  bind,
  swapTo,
  resetView,
};
