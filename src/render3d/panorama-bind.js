import * as THREE from 'three';
import { PRESET_MATERIALS, buildDisplayAssignments } from '../upload/material-router.js';

const EAGER_LOAD_COUNT = 8;
const BACKGROUND_BATCH_SIZE = 2;
const PLACEHOLDER_IMAGE = new THREE.Color('#293857');
const PLACEHOLDER_VIDEO = new THREE.Color('#38482d');
const PLACEHOLDER_PANORAMA = new THREE.Color('#3e3052');

const FOCUS_RECEDE_DISTANCE = 0.22;
const FOCUS_SIBLING_OPACITY = 0.55;
const FOCUS_SIBLING_EMISSIVE = 0.06;
const FOCUS_ACTIVE_EMISSIVE_BOOST = 0.32;

let textureLoader = null;
let bindVersion = 0;
let queueTimer = 0;
let offReady = null;
let offMaterials = null;
let offShards = null;
let offState = null;
let offMood = null;
let offArrangement = null;
let offTimeline = null;
const mediaCache = new Map();
let activeMood = 'wistful';

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
          url,
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
    video.preload = 'metadata';

    const onLoaded = () => {
      cleanup();
      const texture = new THREE.VideoTexture(video);
      texture.generateMipmaps = false;
      resolve({
        kind: 'video',
        texture,
        mediaEl: video,
        url,
        async play() {
          try {
            await video.play();
          } catch {}
        },
        pause() {
          video.pause();
        },
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
    video.load();
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
    resource.pause?.();
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
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.center.set(0.5, 0.5);
  texture.repeat.set(1, 1);

  if (config?.projection === 'panorama') {
    texture.wrapS = THREE.RepeatWrapping;
  } else {
    texture.wrapS = THREE.ClampToEdgeWrapping;
  }

  texture.needsUpdate = true;
}

function getPlaceholderColor(config) {
  if (config?.projection === 'panorama') return PLACEHOLDER_PANORAMA;
  if (config?.type === 'video') return PLACEHOLDER_VIDEO;
  return PLACEHOLDER_IMAGE;
}

function applyShardMetadata(shard, config) {
  shard.mesh.userData.shardId = shard.id;
  shard.mesh.userData.slotIndex = config.slotIndex ?? shard.index;
  shard.mesh.userData.sourceId = config.sourceId ?? config.id;
  shard.mesh.userData.materialName = config.name || config.id;
  shard.mesh.userData.materialType = config.type;
  shard.mesh.userData.materialUrl = config.url;
  shard.mesh.userData.projection = config.projection;
  shard.mesh.userData.distortionProfile = config.distortionProfile;
  shard.mesh.userData.repeated = !!config.repeated;
  shard.mesh.userData.pairedWith = config.pairedWith ?? null;
  shard.mesh.userData.caption = config.caption ?? '';
  shard.mesh.userData.location = config.location ?? '';
  shard.mesh.userData.takenAt = config.takenAt ?? null;
  shard.mesh.userData.mood = config.mood ?? null;
  shard.mesh.userData.tags = Array.isArray(config.tags) ? config.tags : [];
}

function applyPlaceholder(shard, config) {
  shard.material.map = null;
  shard.material.color.copy(getPlaceholderColor(config));
  shard.material.opacity = 0.92;
  shard.material.emissive?.set(config.type === 'video' ? '#1c240f' : '#141f34');
  shard.material.emissiveIntensity = config.projection === 'panorama' ? 0.22 : 0.16;
  shard.material.needsUpdate = true;
  applyShardMetadata(shard, config);
}

function getAssignments() {
  const assignments = window.SM.materialAssignments?.length
    ? window.SM.materialAssignments
    : buildDisplayAssignments(window.SM.materials?.length ? window.SM.materials : PRESET_MATERIALS);

  window.SM.materialAssignments = assignments;
  return assignments;
}

function clearQueueTimer() {
  if (!queueTimer) return;
  window.clearTimeout(queueTimer);
  queueTimer = 0;
}

function getLoadOrder(shards) {
  const order = Array.from({ length: shards.length }, (_, index) => index);
  const activeIndex = shards.findIndex((shard) => shard.id === window.SM.activeShardId);
  if (activeIndex > 0) {
    order.splice(activeIndex, 1);
    order.unshift(activeIndex);
  }
  return order;
}

async function syncVideoPlayback() {
  const stateAllowsPlayback = window.SM.currentState === 'sphere' || window.SM.currentState === 'share';
  const assignments = getAssignments();
  const activeUrls = new Set();

  if (stateAllowsPlayback) {
    const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];
    const activeIndex = shards.findIndex((shard) => shard.id === window.SM.activeShardId);
    const activeAssignment = activeIndex >= 0 ? assignments[activeIndex % assignments.length] : null;

    if (activeAssignment?.type === 'video') {
      activeUrls.add(activeAssignment.url);
    } else {
      const fallbackVideo = assignments.find((item) => item.type === 'video');
      if (fallbackVideo) activeUrls.add(fallbackVideo.url);
    }
  }

  const resources = await Promise.allSettled(Array.from(mediaCache.values()));
  await Promise.all(resources.map(async (entry) => {
    if (entry.status !== 'fulfilled' || entry.value.kind !== 'video') return;
    if (activeUrls.has(entry.value.url)) {
      await entry.value.play?.();
      return;
    }
    entry.value.pause?.();
  }));
}

async function hydrateShard(shard, config, version) {
  try {
    const resource = await loadMediaResource(config);
    if (version !== bindVersion) return;

    configureTexture(resource.texture, config);
    shard.material.map = resource.texture;
    shard.material.color.set('#ffffff');
    shard.material.opacity = 0.96;
    shard.material.emissive?.set(config.type === 'video' ? '#113012' : '#0f1c32');
    shard.material.emissiveIntensity = config.type === 'video' ? 0.24 : 0.16;
    shard.material.needsUpdate = true;
    applyShardMetadata(shard, config);
    void syncVideoPlayback();
  } catch (error) {
    if (version !== bindVersion) return;
    console.warn('[panoramaBind] media load failed:', error?.message || error);
  }
}

function queueBackgroundHydration(tasks, version) {
  clearQueueTimer();
  if (!tasks.length) return;

  const tick = async () => {
    if (version !== bindVersion) return;

    const batch = tasks.splice(0, BACKGROUND_BATCH_SIZE);
    await Promise.all(batch.map((task) => task()));

    if (tasks.length) {
      queueTimer = window.setTimeout(tick, 64);
    } else {
      queueTimer = 0;
    }
  };

  queueTimer = window.setTimeout(tick, 80);
}

async function bind(assignments, shards) {
  const safeAssignments = assignments?.length ? assignments : getAssignments();
  if (!shards?.length) return;

  const version = bindVersion + 1;
  bindVersion = version;
  clearQueueTimer();
  await pruneUnusedResources(safeAssignments);

  const order = getLoadOrder(shards);
  shards.forEach((shard, index) => {
    const config = safeAssignments[index % safeAssignments.length];
    applyPlaceholder(shard, config);
  });

  const eagerOrder = order.slice(0, Math.min(EAGER_LOAD_COUNT, order.length));
  const backgroundOrder = order.slice(eagerOrder.length);

  await Promise.all(eagerOrder.map((index) => {
    const config = safeAssignments[index % safeAssignments.length];
    return hydrateShard(shards[index], config, version);
  }));

  const queuedTasks = backgroundOrder.map((index) => {
    const config = safeAssignments[index % safeAssignments.length];
    return () => hydrateShard(shards[index], config, version);
  });

  queueBackgroundHydration(queuedTasks, version);
  void syncVideoPlayback();
  window.SM.bus.emit('materials:bound', { count: safeAssignments.length });
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

// Apply "focus mode" by re-anchoring each shard's target scale and position.
// The renderer tick in sphere-render.js (see new helper below) reads these.
function applyFocusTransforms(activeShardId) {
  const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];
  shards.forEach((shard) => {
    const isActive = shard.id === activeShardId;
    // Store target transforms on the record; the render tick consumes them.
    shard.focusState = isActive
      ? { scale: 1.08, opacityScale: 1, recede: 0, emissiveBoost: FOCUS_ACTIVE_EMISSIVE_BOOST }
      : { scale: 0.94, opacityScale: FOCUS_SIBLING_OPACITY, recede: FOCUS_RECEDE_DISTANCE, emissiveBoost: -FOCUS_SIBLING_EMISSIVE };
  });
}

async function swapTo(shardId, animate = true) {
  const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];

  shards.forEach((shard) => {
    const isActive = shard.id === shardId;
    shard.material.color = new THREE.Color(isActive ? '#fff1bd' : '#ffffff');
    shard.material.opacity = isActive ? 1 : 0.96;
    if (shard.material.emissive) {
      shard.material.emissive.set(isActive ? '#264421' : shard.mesh.userData.materialType === 'video' ? '#113012' : '#0f1c32');
      shard.material.emissiveIntensity = isActive ? 0.42 : shard.mesh.userData.materialType === 'video' ? 0.24 : 0.16;
    }
  });

  window.SM.activeShardId = shardId;
  window.SM.modules.render3d?.shardSeam?.setColor?.(shardId);
  applyFocusTransforms(shardId);
  const activeShard = shards.find((shard) => shard.id === shardId);
  window.SM.bus.emit('shard:focus', {
    shardId,
    materialName: activeShard?.mesh?.userData?.materialName ?? shardId,
    materialType: activeShard?.mesh?.userData?.materialType ?? 'image',
    projection: activeShard?.mesh?.userData?.projection ?? 'flat',
    distortionProfile: activeShard?.mesh?.userData?.distortionProfile ?? 'sphere-generic',
    slotIndex: activeShard?.mesh?.userData?.slotIndex ?? 0,
    repeated: activeShard?.mesh?.userData?.repeated ?? false,
    caption: activeShard?.mesh?.userData?.caption ?? '',
    location: activeShard?.mesh?.userData?.location ?? '',
    takenAt: activeShard?.mesh?.userData?.takenAt ?? null,
    mood: activeShard?.mesh?.userData?.mood ?? null,
    tags: activeShard?.mesh?.userData?.tags ?? [],
  });

  await syncVideoPlayback();

  if (animate) {
    window.SM.modules.render3d.shardMesh?.rotateBy?.(0.022, -0.014);
  }
}

async function resetView() {
  const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];
  shards.forEach((shard) => {
    shard.material.color = new THREE.Color('#ffffff');
    shard.material.opacity = 0.96;
    if (shard.material.emissive) {
      shard.material.emissive.set(shard.mesh.userData.materialType === 'video' ? '#113012' : '#0f1c32');
      shard.material.emissiveIntensity = shard.mesh.userData.materialType === 'video' ? 0.24 : 0.16;
    }
    shard.focusState = { scale: 1, opacityScale: 1, recede: 0, emissiveBoost: 0 };
  });
  window.SM.activeShardId = null;
  window.SM.modules.render3d?.shardSeam?.setColor?.(null);
  window.SM.bus.emit('shard:blur', {});
  await syncVideoPlayback();
}

function setMood(name) {
  if (!name) return;
  activeMood = name;
  // Re-emit focus so cards pick up new mood color.
  if (window.SM.activeShardId) {
    const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];
    const activeShard = shards.find((shard) => shard.id === window.SM.activeShardId);
    if (activeShard) {
      window.SM.bus.emit('shard:focus', {
        shardId: activeShard.id,
        materialName: activeShard.mesh.userData.materialName,
        materialType: activeShard.mesh.userData.materialType,
        projection: activeShard.mesh.userData.projection,
        slotIndex: activeShard.mesh.userData.slotIndex,
        repeated: activeShard.mesh.userData.repeated,
        caption: activeShard.mesh.userData.caption,
        location: activeShard.mesh.userData.location,
        takenAt: activeShard.mesh.userData.takenAt,
        mood: name,
        tags: activeShard.mesh.userData.tags,
      });
    }
  }
}

function init() {
  offReady = window.SM?.bus?.once?.('app:ready', refreshBindings) ?? null;
  offMaterials = window.SM?.bus?.on?.('materials:updated', refreshBindings) ?? null;
  offShards = window.SM?.bus?.on?.('shards:rebuilt', refreshBindings) ?? null;
  offState = window.SM?.bus?.on?.('state:change', () => {
    void syncVideoPlayback();
  }) ?? null;
  offMood = window.SM?.bus?.on?.('mood:change', ({ name }) => setMood(name)) ?? null;
  offArrangement = window.SM?.bus?.on?.('arrangement:change', refreshBindings) ?? null;
  offTimeline = window.SM?.bus?.on?.('timeline:change', refreshBindings) ?? null;
}

function destroy() {
  offReady?.();
  offMaterials?.();
  offShards?.();
  offState?.();
  offMood?.();
  offArrangement?.();
  offTimeline?.();
  offReady = null;
  offMaterials = null;
  offShards = null;
  offState = null;
  offMood = null;
  offArrangement = null;
  offTimeline = null;
  clearQueueTimer();
  bindVersion += 1;

  Array.from(mediaCache.keys()).forEach((url) => {
    void disposeResource(url);
  });
}

export {
  init,
  destroy,
  bind,
  swapTo,
  resetView,
  setMood,
};
