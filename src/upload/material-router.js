const MIN_SHARD_COUNT = 6;

const PRESET_MATERIALS = [
  {
    id: 'preset-seaside',
    type: 'image',
    name: 'Seaside Golden Hour',
    url: './assets/fallback/travel-media/travel-01-seaside.webp',
    mimeType: 'image/webp',
    isPanorama: false,
    projection: 'flat',
    distortionProfile: 'sphere-crop',
    isPreset: true,
  },
  {
    id: 'preset-mountain-road',
    type: 'image',
    name: 'Mountain Road Sunrise',
    url: './assets/fallback/travel-media/travel-02-mountain-road.webp',
    mimeType: 'image/webp',
    isPanorama: false,
    projection: 'flat',
    distortionProfile: 'sphere-crop',
    isPreset: true,
  },
  {
    id: 'preset-lakeside-camp',
    type: 'image',
    name: 'Lakeside Camp Blue Hour',
    url: './assets/fallback/travel-media/travel-03-lakeside-camp.webp',
    mimeType: 'image/webp',
    isPanorama: false,
    projection: 'flat',
    distortionProfile: 'sphere-crop',
    isPreset: true,
  },
  {
    id: 'preset-city-night',
    type: 'image',
    name: 'City Skyline Night View',
    url: './assets/fallback/travel-media/travel-04-city-night.webp',
    mimeType: 'image/webp',
    isPanorama: false,
    projection: 'flat',
    distortionProfile: 'sphere-crop',
    isPreset: true,
  },
  {
    id: 'preset-seaside-loop',
    type: 'video',
    name: 'Seaside Loop',
    url: './assets/fallback/travel-media/travel-05-seaside-loop.mp4',
    mimeType: 'video/mp4',
    isPanorama: false,
    projection: 'flat',
    distortionProfile: 'sphere-video-crop',
    isPreset: true,
  },
  {
    id: 'preset-lakeside-loop',
    type: 'video',
    name: 'Lakeside Loop',
    url: './assets/fallback/travel-media/travel-06-lakeside-loop.mp4',
    mimeType: 'video/mp4',
    isPanorama: false,
    projection: 'flat',
    distortionProfile: 'sphere-video-crop',
    isPreset: true,
  },
  {
    id: 'preset-desert-drive',
    type: 'image',
    name: 'Desert Drive Sunset',
    url: './assets/fallback/travel-media/travel-07-desert-drive.webp',
    mimeType: 'image/webp',
    isPanorama: false,
    projection: 'flat',
    distortionProfile: 'sphere-crop',
    isPreset: true,
  },
  {
    id: 'preset-island-pier',
    type: 'image',
    name: 'Island Pier Morning',
    url: './assets/fallback/travel-media/travel-08-island-pier.webp',
    mimeType: 'image/webp',
    isPanorama: false,
    projection: 'flat',
    distortionProfile: 'sphere-crop',
    isPreset: true,
  },
];

let objectUrls = [];

function shuffle(list) {
  const next = [...list];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function getBaseMaterials(materials = []) {
  return materials.length ? materials : PRESET_MATERIALS;
}

function buildDisplayAssignments(materials = [], minShardCount = MIN_SHARD_COUNT) {
  const baseMaterials = getBaseMaterials(materials);
  const shardCount = Math.max(minShardCount, baseMaterials.length);
  const expanded = Array.from({ length: shardCount }, (_, index) => {
    const source = baseMaterials[index % baseMaterials.length];

    return {
      ...source,
      slotId: `slot-${index}`,
      slotIndex: index,
      sourceId: source.id,
      repeated: index >= baseMaterials.length,
    };
  });

  return shuffle(expanded);
}

function emitMaterialsUpdated() {
  window.SM?.bus?.emit?.('materials:updated', {
    materials: window.SM.materials,
    assignments: window.SM.materialAssignments,
  });
}

function applyMaterials(materials = []) {
  const baseMaterials = getBaseMaterials(materials);
  window.SM.materials = [...baseMaterials];
  window.SM.materialAssignments = buildDisplayAssignments(baseMaterials);
  emitMaterialsUpdated();
  return window.SM.materialAssignments;
}

function revokeUserObjectUrls() {
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls = [];
}

function getUserMaterials() {
  return (window.SM.materials ?? []).filter((item) => !item.isPreset);
}

function inferProjection(file) {
  const name = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  const panoramaHint = ['pano', 'panorama', 'equirect', '360'].some((token) => name.includes(token));
  const isVideo = mimeType.startsWith('video/');

  if (panoramaHint) {
    return {
      isPanorama: true,
      projection: 'panorama',
      distortionProfile: isVideo ? 'sphere-video-equirect' : 'sphere-equirect',
    };
  }

  if (isVideo) {
    return {
      isPanorama: false,
      projection: 'flat',
      distortionProfile: 'sphere-video-crop',
    };
  }

  if (mimeType === 'image/png' || mimeType === 'image/jpeg' || mimeType === 'image/jpg' || mimeType === 'image/webp') {
    return {
      isPanorama: false,
      projection: 'flat',
      distortionProfile: 'sphere-crop',
    };
  }

  return {
    isPanorama: false,
    projection: 'flat',
    distortionProfile: 'sphere-generic',
  };
}

function createUserMaterials(files, startIndex = 0) {
  return files.map((file, index) => {
    const url = URL.createObjectURL(file);
    objectUrls.push(url);
    const profile = inferProjection(file);

    return {
      id: `upload-${Date.now()}-${startIndex + index}`,
      type: file.type.startsWith('video/') ? 'video' : 'image',
      name: file.name,
      file,
      url,
      mimeType: file.type,
      isPreset: false,
      ...profile,
    };
  });
}

function hydrateFromFiles(fileList) {
  const files = Array.from(fileList ?? []).filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));
  if (!files.length) return applyMaterials(PRESET_MATERIALS);

  const existingUserMaterials = getUserMaterials();
  const shouldAppend = existingUserMaterials.length > 0;

  if (!shouldAppend) {
    revokeUserObjectUrls();
  }

  const materials = shouldAppend
    ? [...existingUserMaterials, ...createUserMaterials(files, existingUserMaterials.length)]
    : createUserMaterials(files);

  return applyMaterials(materials);
}

function usePresetMaterials() {
  revokeUserObjectUrls();
  return applyMaterials(PRESET_MATERIALS);
}

function randomizeAssignments() {
  window.SM.materialAssignments = buildDisplayAssignments(window.SM.materials);
  emitMaterialsUpdated();
  return window.SM.materialAssignments;
}

function init() {
  if (!window.SM.materials.length) {
    applyMaterials(PRESET_MATERIALS);
  } else if (!window.SM.materialAssignments?.length) {
    window.SM.materialAssignments = buildDisplayAssignments(window.SM.materials);
  }
}

function destroy() {
  revokeUserObjectUrls();
}

export {
  MIN_SHARD_COUNT,
  PRESET_MATERIALS,
  init,
  destroy,
  applyMaterials,
  buildDisplayAssignments,
  hydrateFromFiles,
  randomizeAssignments,
  usePresetMaterials,
  inferProjection,
};
