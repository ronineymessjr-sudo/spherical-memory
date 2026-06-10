import * as THREE from 'three';

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let offTap = null;

function pickShard(x, y) {
  const renderer = window.SM.modules.render3d?.scene?.getRenderer?.();
  const camera = window.SM.modules.render3d?.scene?.getCamera?.();
  const shards = window.SM.modules.render3d?.shardMesh?.getShards?.() ?? [];
  if (!renderer || !camera || !shards.length) return null;

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((x - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((y - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObjects(shards.map((record) => record.mesh), false);
  if (!intersections.length) return null;
  return intersections[0].object.userData.shardId ?? null;
}

function init() {
  offTap = window.SM.bus.on('input:tap', ({ x, y, target }) => {
    if (window.SM.currentState !== 'sphere') return;
    if (target !== 'sphere') return;

    const shardId = pickShard(x, y);
    if (!shardId) return;

    window.SM.modules.render3d?.panoramaBind?.swapTo?.(shardId, true);
  });
}

function destroy() {
  offTap?.();
  offTap = null;
}

export {
  init,
  destroy,
};
