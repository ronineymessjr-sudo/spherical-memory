import * as THREE from 'three';

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let offTap = null;
let offDoubleTap = null;
let offLongPress = null;
let offLongPressEnd = null;
let longPressTimer = 0;
let longPressTriggered = false;
let longPressActiveId = null;
let lastTapAt = 0;
let lastTapId = null;
const DOUBLE_TAP_MS = 320;
const LONG_PRESS_MS = 460;

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
    if (!shardId) {
      // Tap on empty space -> reset focus.
      window.SM.modules.render3d?.panoramaBind?.resetView?.();
      return;
    }

    const now = performance.now();
    if (shardId === lastTapId && (now - lastTapAt) < DOUBLE_TAP_MS) {
      // Double tap -> open story page (full-screen card).
      window.SM.bus.emit('shard:story-open', { shardId });
      lastTapId = null;
      lastTapAt = 0;
      return;
    }
    lastTapId = shardId;
    lastTapAt = now;

    window.SM.modules.render3d?.panoramaBind?.swapTo?.(shardId, true);
  });

  offLongPress = window.SM.bus.on('input:long-press-start', ({ x, y, target }) => {
    if (window.SM.currentState !== 'sphere') return;
    if (target !== 'sphere') return;
    const shardId = pickShard(x, y);
    if (!shardId) return;
    longPressTriggered = false;
    longPressActiveId = shardId;
    if (longPressTimer) window.clearTimeout(longPressTimer);
    longPressTimer = window.setTimeout(() => {
      longPressTriggered = true;
      window.SM.bus.emit('shard:hover', { shardId });
    }, LONG_PRESS_MS);
  });

  offLongPressEnd = window.SM.bus.on('input:long-press-end', () => {
    if (longPressTimer) window.clearTimeout(longPressTimer);
    longPressTimer = 0;
    if (longPressTriggered) {
      window.SM.bus.emit('shard:hover-end', { shardId: longPressActiveId });
    }
    longPressTriggered = false;
    longPressActiveId = null;
  });

  offDoubleTap = window.SM.bus.on('shard:hover', ({ shardId }) => {
    if (!shardId) return;
    // The hover "preview" is a small floating bubble that mirrors the memory card.
    const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];
    const shard = shards.find((s) => s.id === shardId);
    if (!shard) return;
    window.SM.bus.emit('shard:focus', {
      shardId,
      materialName: shard.mesh.userData.materialName,
      materialType: shard.mesh.userData.materialType,
      projection: shard.mesh.userData.projection,
      slotIndex: shard.mesh.userData.slotIndex,
      repeated: shard.mesh.userData.repeated,
      caption: shard.mesh.userData.caption,
      location: shard.mesh.userData.location,
      takenAt: shard.mesh.userData.takenAt,
      mood: shard.mesh.userData.mood,
      tags: shard.mesh.userData.tags,
    });
  });
}

function destroy() {
  offTap?.();
  offDoubleTap?.();
  offLongPress?.();
  offLongPressEnd?.();
  offTap = null;
  offDoubleTap = null;
  offLongPress = null;
  offLongPressEnd = null;
  if (longPressTimer) window.clearTimeout(longPressTimer);
  longPressTimer = 0;
}

export {
  init,
  destroy,
};
