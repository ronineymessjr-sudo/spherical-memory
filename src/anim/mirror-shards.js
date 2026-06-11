// Mirror shards — small physical glass tiles that burst out of the mirror
// surface when the user reaches the third tap. They linger for ~1.5s and
// fall away before the particle cloud takes over.

import * as THREE from 'three';

const SHARD_COUNT = 6;
const LIFETIME = 1500; // ms

let shardGroup = null;
let shards = [];
let animationFrame = 0;
let offState = null;

function ensureGroup() {
  if (shardGroup) return shardGroup;
  const scene = window.SM?.modules?.render3d?.scene?.getScene?.();
  const camera = window.SM?.modules?.render3d?.scene?.getCamera?.();
  if (!scene || !camera) return null;
  // We parent to the scene directly because mirror shards live in front of
  // the canvas DOM, not inside the sphere root group.
  shardGroup = new THREE.Group();
  shardGroup.name = 'mirror-shards';
  scene.add(shardGroup);
  return shardGroup;
}

function makeShardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 64, 64);
  g.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
  g.addColorStop(0.5, 'rgba(143, 214, 255, 0.42)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0.18)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  // Streaks
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(6, 58);
  ctx.lineTo(58, 6);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function spawn() {
  const group = ensureGroup();
  if (!group) return;
  // Clear old.
  while (shards.length) {
    const s = shards.pop();
    s.mesh.geometry.dispose();
    s.mesh.material.dispose();
    group.remove(s.mesh);
  }
  const camera = window.SM?.modules?.render3d?.scene?.getCamera?.();
  if (!camera) return;

  // Center point in world space: roughly where the mirror surface is on
  // screen. Project the camera-look direction at distance ~1.0 forward.
  const center = new THREE.Vector3(0, 0, -1.0).applyMatrix4(camera.matrixWorld);
  const normal = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();

  const tex = makeShardTexture();

  for (let i = 0; i < SHARD_COUNT; i += 1) {
    const width = 0.18 + Math.random() * 0.12;
    const height = 0.28 + Math.random() * 0.18;
    const geometry = new THREE.PlaneGeometry(width, height, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(center);
    mesh.lookAt(center.clone().add(normal));
    // Random tilt.
    mesh.rotateZ((Math.random() - 0.5) * 0.6);
    mesh.rotateX((Math.random() - 0.5) * 0.4);
    group.add(mesh);

    // Outward + slight upward velocity away from the mirror plane.
    const outward = normal.clone().multiplyScalar(0.4 + Math.random() * 0.4);
    const tangent = new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.2 + Math.random() * 0.4, 0).applyQuaternion(camera.quaternion);
    const velocity = outward.add(tangent);

    shards.push({
      mesh,
      material,
      velocity,
      angular: new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
      ),
      bornAt: performance.now(),
    });
  }
}

function tick(now) {
  animationFrame = window.requestAnimationFrame(tick);
  if (!shards.length) return;
  const dt = 0.016;
  shards = shards.filter((shard) => {
    const age = now - shard.bornAt;
    if (age > LIFETIME) {
      shard.mesh.geometry.dispose();
      shard.mesh.material.dispose();
      shardGroup.remove(shard.mesh);
      return false;
    }
    shard.mesh.position.addScaledVector(shard.velocity, dt);
    shard.velocity.y -= 1.6 * dt; // gravity
    shard.mesh.rotation.x += shard.angular.x * dt;
    shard.mesh.rotation.y += shard.angular.y * dt;
    shard.mesh.rotation.z += shard.angular.z * dt;
    // Fade out in the last 600ms.
    const fadeStart = LIFETIME - 600;
    if (age > fadeStart) {
      shard.material.opacity = Math.max(0, 0.92 * (1 - (age - fadeStart) / 600));
    }
    return true;
  });
}

function init() {
  ensureGroup();
  tick();
  offState = window.SM?.bus?.on?.('crack:burst', spawn);
}

function destroy() {
  offState?.();
  offState = null;
  if (animationFrame) window.cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  shards.forEach((s) => {
    s.mesh.geometry.dispose();
    s.mesh.material.dispose();
  });
  shards = [];
  shardGroup?.parent?.remove?.(shardGroup);
  shardGroup = null;
}

export {
  init,
  destroy,
  spawn,
};
