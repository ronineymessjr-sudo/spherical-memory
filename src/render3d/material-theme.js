// Material themes — applied to all shard materials at once. Reuses the same
// MeshPhysicalMaterial already in use, so this stays within the existing
// renderer pipeline.

import * as THREE from 'three';

const THEMES = {
  glass: {
    label: 'glass',
    params: {
      color: '#ffffff',
      transparent: true,
      opacity: 0.94,
      roughness: 0.12,
      metalness: 0.08,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
      transmission: 0.55,
      thickness: 0.32,
      ior: 1.46,
      sheen: 0.7,
      emissive: '#0f1c32',
      emissiveIntensity: 0.18,
    },
  },
  aurora: {
    label: 'aurora',
    params: {
      color: '#cde9ff',
      transparent: true,
      opacity: 0.92,
      roughness: 0.22,
      metalness: 0.18,
      clearcoat: 0.4,
      clearcoatRoughness: 0.34,
      transmission: 0.18,
      thickness: 0.4,
      ior: 1.28,
      sheen: 0.9,
      emissive: '#133f4a',
      emissiveIntensity: 0.24,
    },
  },
  film: {
    label: 'film',
    params: {
      color: '#f5e8d2',
      transparent: true,
      opacity: 0.96,
      roughness: 0.62,
      metalness: 0.02,
      clearcoat: 0.12,
      clearcoatRoughness: 0.6,
      transmission: 0.0,
      thickness: 0.18,
      ior: 1.22,
      sheen: 0.2,
      emissive: '#2b1d10',
      emissiveIntensity: 0.12,
    },
  },
  metal: {
    label: 'metal',
    params: {
      color: '#f4f6fb',
      transparent: true,
      opacity: 0.98,
      roughness: 0.18,
      metalness: 0.92,
      clearcoat: 0.5,
      clearcoatRoughness: 0.18,
      transmission: 0.0,
      thickness: 0.16,
      ior: 1.42,
      sheen: 0.3,
      emissive: '#0c0f18',
      emissiveIntensity: 0.2,
    },
  },
};

let activeTheme = 'glass';
let offShards = null;
let offTheme = null;

function applyTheme(name) {
  if (!THEMES[name]) return;
  activeTheme = name;
  const theme = THEMES[name];

  const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];
  shards.forEach((shard) => {
    const mat = shard.material;
    Object.entries(theme.params).forEach(([key, value]) => {
      if (mat[key] && typeof mat[key].set === 'function') {
        mat[key].set(value);
      } else if (mat[key] !== undefined) {
        mat[key] = value;
      }
    });
    mat.userData.baseOpacity = theme.params.opacity;
    mat.userData.baseEmissiveIntensity = theme.params.emissiveIntensity;
    mat.needsUpdate = true;
  });
  window.SM.bus?.emit?.('theme:change', { name });
}

function listThemes() {
  return Object.keys(THEMES);
}

function getActiveTheme() {
  return activeTheme;
}

function init() {
  // Apply default after first shards are built.
  offShards = window.SM.bus.on('shards:rebuilt', () => {
    applyTheme(activeTheme);
  });
  offTheme = window.SM.bus.on('theme:set', ({ name }) => {
    applyTheme(name);
  });
}

function destroy() {
  offShards?.();
  offTheme?.();
  offShards = null;
  offTheme = null;
}

export {
  init,
  destroy,
  applyTheme,
  listThemes,
  getActiveTheme,
};
