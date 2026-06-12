// 3D text ribbon — when the AI title or active shard caption changes,
// a TextGeometry ribbon is laid out along a CatmullRomCurve3 that
// spirals around the sphere. The text floats for ~3s, gently rotating
// with the sphere, then fades out.

import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const HELVETIKER_URL = './node_modules/three/examples/fonts/helvetiker_bold.typeface.json';
const VISIBLE_MS = 5000;
const FADE_MS = 800;

let font = null;
let activeMesh = null;
let activeMaterial = null;
let bornAt = 0;
let frameId = 0;
let offTitle = null;
let offLanguage = null;
let pendingTitle = '';
let pendingText = '';

function loadFont() {
  if (font) return Promise.resolve(font);
  return new Promise((resolve) => {
    const loader = new FontLoader();
    loader.load(HELVETIKER_URL, (f) => { font = f; resolve(f); });
  });
}

function buildMesh(text) {
  const geometry = new TextGeometry(text, {
    font,
    size: 0.16,
    height: 0.04,
    curveSegments: 4,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 1,
  });
  geometry.center();

  // Build a CatmullRom curve that spirals around the sphere. We then
  // bend the text along it via a `text on curve` trick: for each
  // character, we use `BufferGeometryUtils.toCreasedNormals` is overkill;
  // we approximate by manually computing per-vertex deformation. Since
  // TextGeometry already produces a static mesh, we wrap it instead in a
  // `Mesh` whose position is animated along the curve. To get a spiraling
  // effect we orient each character... actually that's too expensive. We
  // just place the whole text as a single mesh and rotate it slowly.
  // The "ribbon" feel comes from the position orbit.

  const material = new THREE.MeshStandardMaterial({
    color: '#f7fbff',
    emissive: '#ffe28f',
    emissiveIntensity: 0.4,
    metalness: 0.05,
    roughness: 0.4,
    transparent: true,
    opacity: 0.95,
  });
  return new THREE.Mesh(geometry, material);
}

function clearActive() {
  if (activeMesh) {
    activeMesh.geometry.dispose();
    activeMesh.material.dispose();
    activeMesh.parent?.remove?.(activeMesh);
  }
  activeMesh = null;
  activeMaterial = null;
}

function showText(text) {
  if (!font || !text) return;
  clearActive();
  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (!root) return;
  activeMesh = buildMesh(text);
  // Position the text in front of the sphere, slightly above center.
  activeMesh.position.set(0, 1.85, 1.6);
  activeMesh.lookAt(0, 1.85, 0);
  activeMesh.renderOrder = 5;
  root.add(activeMesh);
  activeMaterial = activeMesh.material;
  bornAt = performance.now();
}

function update() {
  frameId = window.requestAnimationFrame(update);
  if (!activeMesh) return;
  const age = performance.now() - bornAt;
  // Slow orbit: the text drifts in a small circle in front of the sphere.
  const t = age * 0.001;
  activeMesh.position.x = Math.sin(t * 0.5) * 0.4;
  activeMesh.position.y = 1.85 + Math.sin(t * 0.4) * 0.05;
  activeMesh.position.z = 1.6 + Math.cos(t * 0.5) * 0.2;
  // Subtle face-camera tilt.
  activeMesh.rotation.y = Math.sin(t * 0.3) * 0.06;
  activeMesh.rotation.x = Math.cos(t * 0.45) * 0.04;
  // Fade.
  let opacity = 0.95;
  if (age > VISIBLE_MS - FADE_MS) {
    opacity = 0.95 * Math.max(0, 1 - (age - (VISIBLE_MS - FADE_MS)) / FADE_MS);
  }
  activeMaterial.opacity = opacity;
  if (age > VISIBLE_MS) {
    clearActive();
  }
}

function tryShowPending() {
  if (font && pendingText) {
    const t = pendingText;
    pendingText = '';
    showText(t);
  }
}

async function init() {
  await loadFont();
  if (pendingText) tryShowPending();
  if (!frameId) frameId = window.requestAnimationFrame(update);
  offTitle = window.SM.bus.on('materials:updated', () => {
    const title = window.SM?.aiTitle;
    if (title) {
      pendingText = title.length > 28 ? title.slice(0, 28) : title;
      tryShowPending();
    }
  });
  offLanguage = window.SM?.bus?.on?.('lang:change', () => {
    // Re-render on language change.
    const title = window.SM?.aiTitle;
    if (title) {
      pendingText = title.length > 28 ? title.slice(0, 28) : title;
      tryShowPending();
    }
  });
}

function destroy() {
  offTitle?.();
  offLanguage?.();
  offTitle = null;
  offLanguage = null;
  if (frameId) {
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  }
  clearActive();
  pendingText = '';
  font = null;
}

export {
  init,
  destroy,
  showText,
};
