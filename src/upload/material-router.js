import { annotateMaterials, groupMaterials, pickMainShards, suggestTitle, annotateMaterialsRemote, DEFAULT_ENDPOINT } from '../ai/heuristic.js';

const MIN_SHARD_COUNT = 6;

const PRESET_MATERIALS = [
  {
    id: 'preset-seaside',
    type: 'image',
    name: '2025-08-seaside-golden-hour.webp',
    url: './assets/fallback/travel-media/travel-01-seaside.webp',
    mimeType: 'image/webp',
    isPanorama: false,
    projection: 'flat',
    distortionProfile: 'sphere-crop',
    isPreset: true,
    theme: 'island',
    caption: 'Seaside Golden Hour',
    location: 'Bali · Uluwatu',
    takenAt: '2025-08-12',
    mood: 'vivid',
    tags: ['海边', '落日'],
  },
  {
    id: 'preset-mountain-road',
    type: 'image',
    name: '2025-09-mountain-road-sunrise.webp',
    url: './assets/fallback/travel-media/travel-02-mountain-road.webp',
    mimeType: 'image/webp',
    isPanorama: false,
    projection: 'flat',
    distortionProfile: 'sphere-crop',
    isPreset: true,
    theme: 'snow',
    caption: 'Mountain Road Sunrise',
    location: 'Yunnan · Shangri-La',
    takenAt: '2025-09-04',
    mood: 'healing',
    tags: ['山林', '旅途'],
  },
  {
    id: 'preset-lakeside-camp',
    type: 'image',
    name: '2025-09-lakeside-camp-blue-hour.webp',
    url: './assets/fallback/travel-media/travel-03-lakeside-camp.webp',
    mimeType: 'image/webp',
    isPanorama: false,
    projection: 'flat',
    distortionProfile: 'sphere-crop',
    isPreset: true,
    theme: 'snow',
    caption: 'Lakeside Camp Blue Hour',
    location: 'Sichuan · Daocheng',
    takenAt: '2025-09-18',
    mood: 'wistful',
    tags: ['山林'],
  },
  {
    id: 'preset-city-night',
    type: 'image',
    name: '2025-11-city-skyline-night.webp',
    url: './assets/fallback/travel-media/travel-04-city-night.webp',
    mimeType: 'image/webp',
    isPanorama: false,
    projection: 'flat',
    distortionProfile: 'sphere-crop',
    isPreset: true,
    theme: 'city',
    caption: 'City Skyline Night View',
    location: 'Tokyo · Shibuya',
    takenAt: '2025-11-02',
    mood: 'vivid',
    tags: ['城市', '夜景'],
  },
  {
    id: 'preset-seaside-loop',
    type: 'video',
    name: '2025-08-seaside-loop.mp4',
    url: './assets/fallback/travel-media/travel-05-seaside-loop.mp4',
    mimeType: 'video/mp4',
    isPanorama: false,
    projection: 'flat',
    distortionProfile: 'sphere-video-crop',
    isPreset: true,
    theme: 'island',
    caption: 'Seaside Loop',
    location: 'Bali · Uluwatu',
    takenAt: '2025-08-13',
    mood: 'vivid',
    tags: ['海边'],
  },
  {
    id: 'preset-lakeside-loop',
    type: 'video',
    name: '2025-09-lakeside-loop.mp4',
    url: './assets/fallback/travel-media/travel-06-lakeside-loop.mp4',
    mimeType: 'video/mp4',
    isPanorama: false,
    projection: 'flat',
    distortionProfile: 'sphere-video-crop',
    isPreset: true,
    theme: 'snow',
    caption: 'Lakeside Loop',
    location: 'Sichuan · Daocheng',
    takenAt: '2025-09-19',
    mood: 'healing',
    tags: ['山林'],
  },
  {
    id: 'preset-desert-drive',
    type: 'image',
    name: '2025-10-desert-drive-sunset.webp',
    url: './assets/fallback/travel-media/travel-07-desert-drive.webp',
    mimeType: 'image/webp',
    isPanorama: false,
    projection: 'flat',
    distortionProfile: 'sphere-crop',
    isPreset: true,
    theme: 'snow',
    caption: 'Desert Drive Sunset',
    location: 'Arizona · Monument Valley',
    takenAt: '2025-10-21',
    mood: 'vivid',
    tags: ['落日', '旅途'],
  },
  {
    id: 'preset-island-pier',
    type: 'image',
    name: '2025-08-island-pier-morning.webp',
    url: './assets/fallback/travel-media/travel-08-island-pier.webp',
    mimeType: 'image/webp',
    isPanorama: false,
    projection: 'flat',
    distortionProfile: 'sphere-crop',
    isPreset: true,
    theme: 'island',
    caption: 'Island Pier Morning',
    location: 'Maldives · Addu',
    takenAt: '2025-08-26',
    mood: 'healing',
    tags: ['海边'],
  },
];

const THEME_PRESETS = {
  all: PRESET_MATERIALS,
  island: PRESET_MATERIALS.filter((m) => m.theme === 'island'),
  city: PRESET_MATERIALS.filter((m) => m.theme === 'city'),
  snow: PRESET_MATERIALS.filter((m) => m.theme === 'snow'),
};

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

function applyDerivedState(materials = [], options = {}) {
  const baseMaterials = Array.isArray(materials) ? materials : [];
  const lang = window.SM?.lang === 'zh' ? 'zh' : 'en';
  const nextMaterials = options.skipAnnotate ? baseMaterials : annotateMaterials(baseMaterials, { lang });
  const nextLibrary = options.preserveLibrary
    ? (window.SM.materialLibrary?.length ? window.SM.materialLibrary : nextMaterials)
    : nextMaterials;

  window.SM.materials = nextMaterials;
  window.SM.materialLibrary = nextLibrary;
  window.SM.materialAssignments = buildDisplayAssignments(nextMaterials);
  window.SM.aiGroups = groupMaterials(nextLibrary);
  window.SM.aiMainShards = pickMainShards(nextLibrary, 3);
  window.SM.aiTitle = suggestTitle(nextMaterials, lang);
  window.SM.activeGroupKey = options.activeGroupKey ?? '__all__';
  emitMaterialsUpdated();
  return window.SM.materialAssignments;
}

function applyMaterials(materials = []) {
  return applyDerivedState(getBaseMaterials(materials));
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

function useThemePreset(theme) {
  const preset = THEME_PRESETS[theme] ?? PRESET_MATERIALS;
  if (preset === PRESET_MATERIALS) {
    revokeUserObjectUrls();
  }
  return applyMaterials(preset);
}

function listThemePresets() {
  return Object.keys(THEME_PRESETS);
}

function randomizeAssignments() {
  window.SM.materialAssignments = buildDisplayAssignments(window.SM.materials);
  emitMaterialsUpdated();
  return window.SM.materialAssignments;
}

function useGroupMaterials(groupKey) {
  const group = (window.SM.aiGroups ?? []).find((g) => g.key === groupKey);
  if (!group) return restoreAllMaterials();
  return applyDerivedState(group.items, {
    preserveLibrary: true,
    activeGroupKey: groupKey,
    skipAnnotate: true,
  });
}

function restoreAllMaterials() {
  const library = window.SM.materialLibrary?.length ? window.SM.materialLibrary : window.SM.materials;
  return applyDerivedState(library, {
    skipAnnotate: true,
    activeGroupKey: '__all__',
  });
}

function pairMaterials(olderId, newerId) {
  const pairs = (window.SM.materialAssignments ?? []).map((assignment) => {
    if (assignment.sourceId === olderId) {
      return { ...assignment, pairedWith: newerId, distortionProfile: 'sphere-split-left' };
    }
    if (assignment.sourceId === newerId) {
      return { ...assignment, pairedWith: olderId, distortionProfile: 'sphere-split-right' };
    }
    return assignment;
  });
  window.SM.materialAssignments = pairs;
  emitMaterialsUpdated();
  return pairs;
}

function init() {
  if (!window.SM.materials.length) {
    applyMaterials(PRESET_MATERIALS);
  } else if (!window.SM.materialAssignments?.length) {
    window.SM.materialAssignments = buildDisplayAssignments(window.SM.materials);
  }
  // Best-effort remote AI re-annotation. Endpoint is optional and the call is
  // best-effort — if the backend is unreachable we keep the local heuristic.
  const endpoint = window.SM?.aiEndpoint || DEFAULT_ENDPOINT;
  if (endpoint) {
    annotateMaterialsRemote(window.SM.materials, { endpoint, lang: window.SM?.lang || 'en' })
      .then((annotated) => {
        if (!annotated?.length) return;
        applyDerivedState(annotated, {
          skipAnnotate: true,
          activeGroupKey: '__all__',
        });
      })
      .catch(() => {});
  }
}

function destroy() {
  revokeUserObjectUrls();
}

export {
  MIN_SHARD_COUNT,
  PRESET_MATERIALS,
  THEME_PRESETS,
  init,
  destroy,
  applyMaterials,
  buildDisplayAssignments,
  hydrateFromFiles,
  randomizeAssignments,
  usePresetMaterials,
  useThemePreset,
  listThemePresets,
  inferProjection,
  annotateMaterials,
  groupMaterials,
  pickMainShards,
  suggestTitle,
  useGroupMaterials,
  restoreAllMaterials,
  pairMaterials,
};
