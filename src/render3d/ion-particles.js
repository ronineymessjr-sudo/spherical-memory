import * as THREE from 'three';

const PARTICLE_COUNT = 560;
const positions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);
const velocities = new Float32Array(PARTICLE_COUNT * 3);
let geometry = null;
let material = null;
let points = null;
let burstStartedAt = 0;
let animationFrame = 0;
let active = false;
let offExplode = null;

function createSpriteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(143,214,255,0.95)');
  gradient.addColorStop(0.7, 'rgba(255,122,198,0.55)');
  gradient.addColorStop(1, 'rgba(255,122,198,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function ensurePoints() {
  if (points) return points;

  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (!root) return null;

  geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  material = new THREE.PointsMaterial({
    size: 0.09,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    map: createSpriteTexture(),
  });

  points = new THREE.Points(geometry, material);
  points.visible = false;
  root.add(points);
  return points;
}

function seedBurst() {
  const shardRecords = window.SM.modules.render3d?.shardMesh?.getShards?.() ?? [];
  if (!shardRecords.length) return;

  ensurePoints();
  points.visible = true;
  material.opacity = 1;
  burstStartedAt = performance.now();
  active = true;

  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const shard = shardRecords[index % shardRecords.length];
    const base = shard.explodedPosition.clone().multiplyScalar(0.5 + Math.random() * 0.5);
    const offset = index * 3;
    const velocity = shard.explodedPosition.clone().normalize().multiplyScalar(0.012 + Math.random() * 0.034);
    velocity.x += (Math.random() - 0.5) * 0.028;
    velocity.y += (Math.random() - 0.5) * 0.028;
    velocity.z += (Math.random() - 0.5) * 0.028;

    positions[offset] = base.x;
    positions[offset + 1] = base.y;
    positions[offset + 2] = base.z;

    velocities[offset] = velocity.x;
    velocities[offset + 1] = velocity.y;
    velocities[offset + 2] = velocity.z;

    const warm = index % 3 === 0;
    colors[offset] = warm ? 1 : 0.56;
    colors[offset + 1] = warm ? 0.84 : 0.86;
    colors[offset + 2] = warm ? 0.52 : 1;
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
}

function tick() {
  animationFrame = window.requestAnimationFrame(tick);
  if (!active || !points) return;

  const elapsed = performance.now() - burstStartedAt;
  const fade = Math.max(0, 1 - elapsed / 1150);

  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const offset = index * 3;
    positions[offset] += velocities[offset];
    positions[offset + 1] += velocities[offset + 1];
    positions[offset + 2] += velocities[offset + 2];

    velocities[offset] *= 0.985;
    velocities[offset + 1] *= 0.985;
    velocities[offset + 2] *= 0.985;
  }

  geometry.attributes.position.needsUpdate = true;
  material.opacity = fade;

  if (fade <= 0.02) {
    active = false;
    points.visible = false;
  }
}

function init() {
  ensurePoints();
  tick();
  offExplode = window.SM.bus.on('crack:explode', () => {
    seedBurst();
  });
}

function destroy() {
  offExplode?.();
  offExplode = null;
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }
  geometry?.dispose?.();
  material?.dispose?.();
  points?.parent?.remove?.(points);
  geometry = null;
  material = null;
  points = null;
  active = false;
}

export {
  init,
  destroy,
};
