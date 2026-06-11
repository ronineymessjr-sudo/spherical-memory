// Render tick that smoothly applies focus state (recede, scale, opacity) to
// each shard. Driven by the same render loop used by `scene.js`.

import * as THREE from 'three';

let animationFrame = 0;
let offReset = null;

const tmpVec = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpVec2 = new THREE.Vector3();
const focusEnabled = new WeakMap();

function ensureFocusEnabled(shard) {
  if (!focusEnabled.has(shard)) {
    focusEnabled.set(shard, {
      position: shard.mesh.position.clone(),
      scale: 1,
      opacity: shard.material.opacity,
      emissive: shard.material.emissiveIntensity,
    });
  }
  return focusEnabled.get(shard);
}

function tick() {
  animationFrame = window.requestAnimationFrame(tick);
  const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];
  const focusId = window.SM.activeShardId;

  shards.forEach((shard) => {
    const target = shard.focusState ?? { scale: 1, opacityScale: 1, recede: 0, emissiveBoost: 0 };
    const mem = ensureFocusEnabled(shard);
    // Lerp toward target.
    mem.scale = THREE.MathUtils.lerp(mem.scale, target.scale, 0.08);
    mem.opacity = THREE.MathUtils.lerp(mem.opacity, shard.material.userData.baseOpacity * target.opacityScale, 0.08);
    mem.emissive = THREE.MathUtils.lerp(
      mem.emissive,
      (shard.material.userData.baseEmissiveIntensity ?? 0.16) + target.emissiveBoost,
      0.08,
    );

    shard.mesh.scale.setScalar(mem.scale);

    // Recede: shift shard along its outward direction.
    if (shard.direction && target.recede) {
      tmpVec.copy(shard.basePosition).addScaledVector(shard.direction, -target.recede);
      shard.mesh.position.lerp(tmpVec, 0.08);
    } else {
      // No recede -> settle back to base.
      shard.mesh.position.lerp(shard.basePosition, 0.08);
    }

    shard.material.opacity = mem.opacity;
    shard.material.emissiveIntensity = mem.emissive;
  });

  // The currently focused shard should also keep a tiny breathing glow.
  if (focusId) {
    const focused = shards.find((s) => s.id === focusId);
    if (focused) {
      const t = performance.now() * 0.0016;
      focused.material.emissiveIntensity = (focused.material.userData.baseEmissiveIntensity ?? 0.16) + 0.18 + Math.sin(t) * 0.06;
    }
  }
}

function init() {
  tick();
}

function destroy() {
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }
}

export {
  init,
  destroy,
};
