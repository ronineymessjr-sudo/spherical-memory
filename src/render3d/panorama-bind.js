import * as THREE from 'three';
import { PRESET_MATERIALS, buildDisplayAssignments } from '../upload/material-router.js';

let textureLoader = null;
let offReady = null;
let offMaterials = null;
let offShards = null;
const mediaCache = new Map();

function getLoader() {
  if (!textureLoader) textureLoader = new THREE.TextureLoader();
  return textureLoader;
}

function createImageResource(url) {
  return new Promise((resolve, reject) => {
    getLoader().load(
      url,
      (texture) => {
        resolve({
          kind: 'image',
          texture,
          dispose() {
            texture.dispose();
          },
        });
      },
      undefined,
      reject,
    );
  });
}

function createVideoResource(url) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';

    const onLoaded = async () => {
      cleanup();
      try {
        await video.play();
      } catch {}

      const texture = new THREE.VideoTexture(video);
      resolve({
        kind: 'video',
        texture,
        mediaEl: video,
        dispose() {
          video.pause();
          video.removeAttribute('src');
          video.load();
          texture.dispose();
        },
      });
    };

    const onError = () => {
      cleanup();
      reject(new Error(`Video load failed for ${url}`));
    };

    const cleanup = () => {
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('error', onError);
    };

    video.addEventListener('loadeddata', onLoaded, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
}

function loadMediaResource(config) {
  if (mediaCache.has(config.url)) return mediaCache.get(config.url);

  const promise = config.type === 'video'
    ? createVideoResource(config.url)
    : createImageResource(config.url);

  mediaCache.set(config.url, promise);
  return promise;
}

async function disposeResource(url) {
  const pending = mediaCache.get(url);
  if (!pending) return;

  try {
    const resource = await pending;
    resource.dispose?.();
  } catch {}

  mediaCache.delete(url);
}

async function pruneUnusedResources(assignments) {
  const activeUrls = new Set(assignments.map((item) => item.url));
  const staleUrls = Array.from(mediaCache.keys()).filter((url) => !activeUrls.has(url));
  await Promise.all(staleUrls.map(disposeResource));
}

function configureTexture(texture, config) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  if (config?.projection === 'panorama') {
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.center.set(0.5, 0.5);
  } else {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(1, 1);
    texture.center.set(0.5, 0.5);
  }

  texture.needsUpdate = true;
}

function getAssignments() {
  const assignments = window.SM.materialAssignments?.length
    ? window.SM.materialAssignments
    : buildDisplayAssignments(window.SM.materials?.length ? window.SM.materials : PRESET_MATERIALS);

  window.SM.materialAssignments = assignments;
  return assignments;
}

async function bind(assignments, shards) {
  const safeAssignments = assignments?.length ? assignments : getAssignments();
  if (!shards?.length) return;

  await pruneUnusedResources(safeAssignments);

  await Promise.all(shards.map(async (shard, index) => {
    const config = safeAssignments[index % safeAssignments.length];
    const resource = await loadMediaResource(config);
    configureTexture(resource.texture, config);
    shard.material.map = resource.texture;
    shard.material.color = new THREE.Color('#ffffff');
    shard.material.opacity = 0.98;
    shard.material.needsUpdate = true;
    shard.mesh.userData.shardId = shard.id;
    shard.mesh.userData.materialName = config.name || config.id;
    shard.mesh.userData.materialType = config.type;
    shard.mesh.userData.projection = config.projection;
    shard.mesh.userData.distortionProfile = config.distortionProfile;
  }));

  window.SM.bus.emit('materials:bound', {
    count: safeAssignments.length,
  });
}

async function refreshBindings() {
  const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];
  if (!shards.length) return;

  try {
    await bind(getAssignments(), shards);
  } catch (error) {
    console.warn('[panoramaBind] texture bind failed:', error?.message || error);
  }
}

async function swapTo(shardId, animate = true) {
  const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];

  shards.forEach((shard) => {
    const isActive = shard.id === shardId;
    shard.material.color = new THREE.Color(isActive ? '#ffe5a3' : '#ffffff');
    shard.material.opacity = isActive ? 1 : 0.96;
  });

  window.SM.activeShardId = shardId;
  window.SM.modules.render3d?.shardSeam?.setColor?.(shardId);
  const activeShard = shards.find((shard) => shard.id === shardId);
  window.SM.bus.emit('shard:focus', {
    shardId,
    materialName: activeShard?.mesh?.userData?.materialName ?? shardId,
    materialType: activeShard?.mesh?.userData?.materialType ?? 'image',
    projection: activeShard?.mesh?.userData?.projection ?? 'flat',
    distortionProfile: activeShard?.mesh?.userData?.distortionProfile ?? 'sphere-generic',
  });

  if (animate) {
    window.SM.modules.render3d.shardMesh?.rotateBy?.(0.06, -0.04);
  }
}

async function resetView() {
  const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];
  shards.forEach((shard) => {
    shard.material.color = new THREE.Color('#ffffff');
    shard.material.opacity = 0.98;
  });
  window.SM.activeShardId = null;
  window.SM.modules.render3d?.shardSeam?.setColor?.(null);
  window.SM.bus.emit('shard:blur', {});
}

function init() {
  offReady = window.SM?.bus?.once?.('app:ready', refreshBindings) ?? null;
  offMaterials = window.SM?.bus?.on?.('materials:updated', refreshBindings) ?? null;
  offShards = window.SM?.bus?.on?.('shards:rebuilt', refreshBindings) ?? null;
}

function destroy() {
  offReady?.();
  offMaterials?.();
  offShards?.();
  offReady = null;
  offMaterials = null;
  offShards = null;

  Array.from(mediaCache.keys()).forEach((url) => {
    disposeResource(url);
  });
}

export {
  init,
  destroy,
  bind,
  swapTo,
  resetView,
};
