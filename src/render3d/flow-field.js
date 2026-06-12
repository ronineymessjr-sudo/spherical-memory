// Flow-field dust — a layer of small bright particles drifting through a
// procedural noise field outside the sphere. The field is sampled per frame
// per particle (cheap because the field is a sum of two sin waves). The
// particles are repelled from the sphere center so they orbit/swirl rather
// than collide with the sphere.

import * as THREE from 'three';

const PARTICLE_COUNT = 700;
const FIELD_RADIUS = 6.0;
const positions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);
const seeds = new Float32Array(PARTICLE_COUNT);

let geometry = null;
let material = null;
let points = null;
let frameId = 0;
let mood = 'wistful';

const MOOD_TINT = {
  vivid: new THREE.Color('#ffd28a'),
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

  // Procedural sprite: a soft round dot.
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  material = new THREE.PointsMaterial({
    size: 0.05,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    map: tex,
  });

  points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  root.add(points);
  return points;
}

function seedParticles() {
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    // Distribute on a thick spherical shell so they look like drifting dust.
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = 2 * Math.PI * Math.random();
    const r = 2.6 + Math.random() * (FIELD_RADIUS - 2.6);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.cos(phi);
    const z = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    seeds[i] = Math.random() * 100;
    // Base color from mood with small per-particle variation.
    const tint = MOOD_TINT[mood] ?? MOOD_TINT.wistful;
    const variance = 0.6 + Math.random() * 0.4;
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
  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (root) {
    // Inherit sphere rotation so dust feels anchored to the installation.
    points.position.copy(root.position);
  }
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const ix = i * 3;
    let x = positions[ix];
    let y = positions[ix + 1];
    let z = positions[ix + 2];
    const s = seeds[i];
    // Cheap flow field: a sum of two sin/cos based on (x,y,z) and time.
    // The resulting vector is rotated slightly per axis.
    const fx = Math.sin(y * 0.5 + t * 0.4 + s) + Math.cos(z * 0.6 - t * 0.2 + s);
    const fy = Math.sin(z * 0.5 + t * 0.3 + s * 0.7) + Math.cos(x * 0.4 + t * 0.25 + s * 1.1);
    const fz = Math.sin(x * 0.5 + t * 0.35 + s * 1.3) + Math.cos(y * 0.4 - t * 0.15 + s * 0.5);
    // Step size.
    const step = 0.0035;
    x += fx * step;
    y += fy * step;
    z += fz * step;
    // Repel from the sphere center so dust doesn't converge inside the
    // sphere.
    const r = Math.hypot(x, y, z);
    const minR = 2.4;
    const maxR = FIELD_RADIUS;
    if (r < minR) {
      const k = (minR - r) / minR;
      x += (x / r) * k * 0.4;
      y += (y / r) * k * 0.4;
      z += (z / r) * k * 0.4;
    } else if (r > maxR) {
      const k = (r - maxR) / maxR;
      x -= (x / r) * k * 0.3;
      y -= (y / r) * k * 0.3;
      z -= (z / r) * k * 0.3;
    }
    positions[ix] = x;
    positions[ix + 1] = y;
    positions[ix + 2] = z;
  }
  geometry.attributes.position.needsUpdate = true;
  // Subtle opacity breathing so the field feels alive.
  material.opacity = 0.55 + Math.sin(t * 0.6) * 0.15;
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
  seedParticles();
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
