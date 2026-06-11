import * as THREE from 'three';
import { getPalette } from './shard-mesh.js';

const PARTICLE_COUNT = 2400;
const positions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);
const velocities = new Float32Array(PARTICLE_COUNT * 3);
const targets = new Float32Array(PARTICLE_COUNT * 3);
const basePositions = new Float32Array(PARTICLE_COUNT * 3);
const phases = new Float32Array(PARTICLE_COUNT); // 0..1 per particle

let geometry = null;
let material = null;
let points = null;
let innerPoints = null;
let innerGeometry = null;
let innerMaterial = null;
let animationFrame = 0;
let mode = 'idle';
let phaseStartedAt = 0;
let phaseDuration = 0;
let offExplode = null;
let offFuse = null;
let offDone = null;
let offMood = null;
let activeMood = 'wistful';

function createSpriteTexture(hot = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 48);
  if (hot) {
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.32, 'rgba(255,213,170,0.95)');
    gradient.addColorStop(0.7, 'rgba(255,140,108,0.55)');
    gradient.addColorStop(1, 'rgba(255,140,108,0)');
  } else {
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.3, 'rgba(180,220,255,0.72)');
    gradient.addColorStop(0.7, 'rgba(160,180,255,0.28)');
    gradient.addColorStop(1, 'rgba(160,180,255,0)');
  }
  context.fillStyle = gradient;
  context.fillRect(0, 0, 96, 96);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function ensurePoints() {
  if (points) return points;

  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (!root) return null;

  // Outer vapor layer: soft, blurry, large.
  geometry = new THREE.BufferGeometry();
  const positionAttr = new THREE.BufferAttribute(positions, 3);
  const colorAttr = new THREE.BufferAttribute(colors, 3);
  geometry.setAttribute('position', positionAttr);
  geometry.setAttribute('color', colorAttr);

  material = new THREE.PointsMaterial({
    size: 0.18,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    map: createSpriteTexture(false),
    sizeAttenuation: true,
  });

  // Inner ion core: small, hot, sharper. Shares the same buffers — we just
  // need a different material, so re-use the attributes directly.
  innerGeometry = new THREE.BufferGeometry();
  innerGeometry.setAttribute('position', positionAttr);
  innerGeometry.setAttribute('color', colorAttr);

  innerMaterial = new THREE.PointsMaterial({
    size: 0.055,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    map: createSpriteTexture(true),
    sizeAttenuation: true,
  });

  points = new THREE.Points(geometry, material);
  innerPoints = new THREE.Points(innerGeometry, innerMaterial);
  points.visible = false;
  innerPoints.visible = false;
  root.add(points, innerPoints);
  return points;
}

function getShards() {
  return window.SM.modules.render3d?.shardMesh?.getShards?.() ?? [];
}

function setVisible(visible) {
  ensurePoints();
  if (points) points.visible = visible;
  if (innerPoints) innerPoints.visible = visible;
}

function seedColors(index) {
  const offset = index * 3;
  const palette = getPalette(activeMood);
  const baseInner = new THREE.Color(palette.particleInner);
  const baseOuter = new THREE.Color(palette.particleOuter);

  // Mix between inner/outer colors; inner core uses 80% inner, vapor uses 80% outer.
  const useInner = index % 3 === 0;
  const color = useInner ? baseInner : baseOuter;
  colors[offset] = color.r;
  colors[offset + 1] = color.g;
  colors[offset + 2] = color.b;
}

function sampleShardSurfacePoint(shard) {
  const attribute = shard.mesh.geometry?.getAttribute?.('position');
  if (!attribute?.count) {
    return shard.explodedPosition.clone().normalize().multiplyScalar(1.2);
  }
  const index = Math.floor(Math.random() * attribute.count);
  return new THREE.Vector3().fromBufferAttribute(attribute, index).multiplyScalar(0.98);
}

function seedBurst() {
  const shards = getShards();
  if (!shards.length) return;

  ensurePoints();
  setVisible(true);
  mode = 'vaporize';
  phaseStartedAt = performance.now();
  phaseDuration = 1100; // vapor expansion phase
  material.opacity = 0.95;
  material.size = 0.16;
  innerMaterial.opacity = 0.85;
  innerMaterial.size = 0.06;

  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const shard = shards[index % shards.length];
    const direction = shard.explodedPosition.clone().normalize();
    // Each particle starts just outside the shard surface.
    const startRadius = 0.4 + Math.random() * 0.3;
    const base = direction.clone().multiplyScalar(startRadius);
    // Tangential noise for "exploding glass" feel.
    const tangent = new THREE.Vector3(-direction.z, 0, direction.x);
    if (tangent.lengthSq() < 0.0001) tangent.set(1, 0, 0);
    else tangent.normalize();
    base.addScaledVector(tangent, (Math.random() - 0.5) * 0.4);
    base.y += (Math.random() - 0.5) * 0.3;

    const offset = index * 3;
    const speed = 0.04 + Math.random() * 0.07;
    const velocity = direction
      .clone()
      .multiplyScalar(speed)
      .addScaledVector(tangent, (Math.random() - 0.5) * 0.05);

    positions[offset] = base.x;
    positions[offset + 1] = base.y;
    positions[offset + 2] = base.z;

    basePositions[offset] = base.x;
    basePositions[offset + 1] = base.y;
    basePositions[offset + 2] = base.z;

    velocities[offset] = velocity.x;
    velocities[offset + 1] = velocity.y;
    velocities[offset + 2] = velocity.z;

    // During vaporize, particles' "home" target is the swirl shell.
    const swirlTarget = direction
      .clone()
      .multiplyScalar(1.5 + Math.random() * 0.4)
      .addScaledVector(tangent, (Math.random() - 0.5) * 0.5);
    targets[offset] = swirlTarget.x;
    targets[offset + 1] = swirlTarget.y;
    targets[offset + 2] = swirlTarget.z;

    phases[index] = Math.random() * 0.3;
    seedColors(index);
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
  if (innerGeometry.attributes.position !== geometry.attributes.position) {
    innerGeometry.attributes.color.needsUpdate = true;
  }
}

function seedFusion() {
  // Switch the particles' targets to the (currently scattered) shard surface points,
  // but keep the particles in their swirl positions for an extra beat — that's
  // the "imaging" moment when shards crystallize OUT of the cloud.
  const shards = getShards();
  if (!shards.length) return;

  ensurePoints();
  setVisible(true);
  mode = 'imprint';
  phaseStartedAt = performance.now();
  phaseDuration = 1600;
  material.opacity = 0.78;
  material.size = 0.14;
  innerMaterial.opacity = 0.95;
  innerMaterial.size = 0.07;

  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const shard = shards[index % shards.length];
    const target = sampleShardSurfacePoint(shard);
    const offset = index * 3;
    targets[offset] = target.x;
    targets[offset + 1] = target.y;
    targets[offset + 2] = target.z;
    phases[index] = 0.5 + Math.random() * 0.4;
    seedColors(index);
  }

  geometry.attributes.color.needsUpdate = true;
  innerGeometry.attributes.color.needsUpdate = true;
}

function updateVaporize(now) {
  const elapsed = now - phaseStartedAt;
  const fade = Math.max(0, 1 - elapsed / phaseDuration);
  // Particles fly outward, slight inward pull keeps them in a shell.
  material.opacity = 0.42 + fade * 0.5;
  material.size = 0.16 + (1 - fade) * 0.08;
  innerMaterial.opacity = 0.36 + fade * 0.5;
  innerMaterial.size = 0.05 + (1 - fade) * 0.04;

  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const offset = index * 3;
    positions[offset] += velocities[offset];
    positions[offset + 1] += velocities[offset + 1];
    positions[offset + 2] += velocities[offset + 2];

    // Light damping.
    velocities[offset] *= 0.985;
    velocities[offset + 1] *= 0.985;
    velocities[offset + 2] *= 0.985;

    // Turbulence: per-particle phase creates swirls.
    const swirlSign = index % 2 ? 1 : -1;
    const wobble = Math.sin(elapsed * 0.0021 + phases[index] * 6.28) * 0.0035 * swirlSign;
    velocities[offset] += wobble;
    velocities[offset + 2] -= wobble;
  }
}

function updateImprint(now) {
  const elapsed = now - phaseStartedAt;
  const progress = Math.min(elapsed / phaseDuration, 1);
  // Opacity peaks around 0.35 so particles are still visible when shards emerge,
  // then fades to 0 by 0.95.
  const presence = progress < 0.35 ? progress / 0.35 : 1 - Math.pow((progress - 0.35) / 0.65, 2.4);
  material.opacity = 0.5 + presence * 0.45;
  material.size = 0.14 - progress * 0.06;
  innerMaterial.opacity = 0.45 + presence * 0.5;
  innerMaterial.size = 0.07 - progress * 0.03;

  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const offset = index * 3;
    // Spring-like pull toward target.
    const dx = targets[offset] - positions[offset];
    const dy = targets[offset + 1] - positions[offset + 1];
    const dz = targets[offset + 2] - positions[offset + 2];
    const swirl = ((index % 2) ? 1 : -1) * 0.003;
    const spring = 0.024 + (1 - progress) * 0.01;
    const damping = 0.86;

    velocities[offset] = velocities[offset] * damping + dx * spring + (-dy + dz) * swirl;
    velocities[offset + 1] = velocities[offset + 1] * damping + dy * spring + (dx - dz) * swirl;
    velocities[offset + 2] = velocities[offset + 2] * damping + dz * spring + (-dx + dy) * swirl;

    positions[offset] += velocities[offset];
    positions[offset + 1] += velocities[offset + 1];
    positions[offset + 2] += velocities[offset + 2];
  }

  if (progress >= 1) {
    mode = 'idle';
    material.opacity = 0;
    innerMaterial.opacity = 0;
    setVisible(false);
  }
}

function tick(now = performance.now()) {
  animationFrame = window.requestAnimationFrame(tick);
  if (!points || mode === 'idle') return;

  if (mode === 'vaporize') {
    updateVaporize(now);
  } else if (mode === 'imprint') {
    updateImprint(now);
  }

  geometry.attributes.position.needsUpdate = true;
}

function init() {
  ensurePoints();
  tick();
  offExplode = window.SM.bus.on('crack:explode', () => {
    seedBurst();
  });
  offFuse = window.SM.bus.on('aggregate:fuse-start', () => {
    seedFusion();
  });
  offDone = window.SM.bus.on('aggregate:done', () => {
    mode = 'idle';
    if (material) material.opacity = 0;
    if (innerMaterial) innerMaterial.opacity = 0;
    setVisible(false);
  });
  offMood = window.SM.bus.on('mood:change', ({ name }) => {
    if (name) activeMood = name;
  });
}

function destroy() {
  offExplode?.();
  offFuse?.();
  offDone?.();
  offMood?.();
  offExplode = null;
  offFuse = null;
  offDone = null;
  offMood = null;
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }
  geometry?.dispose?.();
  material?.dispose?.();
  innerGeometry?.dispose?.();
  innerMaterial?.dispose?.();
  points?.parent?.remove?.(points);
  innerPoints?.parent?.remove?.(innerPoints);
  geometry = null;
  material = null;
  innerGeometry = null;
  innerMaterial = null;
  points = null;
  innerPoints = null;
  mode = 'idle';
}

export {
  init,
  destroy,
};
