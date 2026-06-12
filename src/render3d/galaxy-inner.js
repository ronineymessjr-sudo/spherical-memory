// Inner galaxy — a spiral of bright particles inside the sphere that
// swirls slowly around the Y axis. The particles are pulled toward the
// center of the sphere at a different rate than the outer flow field, so
// the two layers feel distinct.

import * as THREE from 'three';

const PARTICLE_COUNT = 220;
const ARMS = 3;
const ARM_TURNS = 2.4;
const RADIUS_MIN = 0.35;
const RADIUS_MAX = 1.45;

const positions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);
const seeds = new Float32Array(PARTICLE_COUNT);

let geometry = null;
let material = null;
let points = null;
let frameId = 0;
let mood = 'wistful';

const MOOD_TINT = {
  vivid: new THREE.Color('#ffb17a'),
  wistful: new THREE.Color('#9ed5ff'),
  healing: new THREE.Color('#7be2c8'),
};

function ensurePoints() {
  if (points) return points;
  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (!root) return null;
  geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  material = new THREE.PointsMaterial({
    size: 0.045,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    map: tex,
  });

  points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 0;
  root.add(points);
  return points;
}

function seed() {
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const arm = i % ARMS;
    const t = (i / PARTICLE_COUNT);
    const angle = (t * ARM_TURNS + arm / ARMS) * Math.PI * 2;
    const radius = RADIUS_MIN + (RADIUS_MAX - RADIUS_MIN) * t;
    const y = (Math.sin(t * 12) + (Math.random() - 0.5) * 0.2) * 0.3;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    seeds[i] = Math.random();
    const tint = MOOD_TINT[mood] ?? MOOD_TINT.wistful;
    const variance = 0.7 + Math.random() * 0.4;
    colors[i * 3] = tint.r * variance;
    colors[i * 3 + 1] = tint.g * variance;
    colors[i * 3 + 2] = tint.b * variance;
  }
  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
}

function update() {
  frameId = window.requestAnimationFrame(update);
  if (!points || !material) return;
  const t = performance.now() * 0.001;
  // Slight breathing in opacity.
  material.opacity = 0.65 + Math.sin(t * 0.4) * 0.12;

  // We rotate the whole spiral around Y by a small amount per frame, and
  // also rotate the group itself slowly so it doesn't feel like a static
  // disc. We do this in-place by adjusting positions.
  const rot = t * 0.06;
  const cos = Math.cos(rot * 0.016);
  const sin = Math.sin(rot * 0.016);
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const x = positions[i * 3];
    const z = positions[i * 3 + 2];
    positions[i * 3] = x * cos - z * sin;
    positions[i * 3 + 2] = x * sin + z * cos;
  }
  geometry.attributes.position.needsUpdate = true;
}

function setMood(name) {
  if (!name || !MOOD_TINT[name]) return;
  mood = name;
  if (!geometry) return;
  const tint = MOOD_TINT[name];
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const variance = 0.7 + (seeds[i] % 1) * 0.4;
    colors[i * 3] = tint.r * variance;
    colors[i * 3 + 1] = tint.g * variance;
    colors[i * 3 + 2] = tint.b * variance;
  }
  geometry.attributes.color.needsUpdate = true;
}

let offMood = null;
function init() {
  ensurePoints();
  seed();
  if (!frameId) frameId = window.requestAnimationFrame(update);
  offMood = window.SM.bus.on('mood:change', ({ name }) => setMood(name));
}

function destroy() {
  offMood?.();
  offMood = null;
  if (frameId) {
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  }
  geometry?.dispose?.();
  material?.dispose?.();
  points?.parent?.remove?.(points);
  geometry = null;
  material = null;
  points = null;
}

export {
  init,
  destroy,
  setMood,
};
