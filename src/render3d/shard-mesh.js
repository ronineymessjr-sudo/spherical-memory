import * as THREE from 'three';
import { MIN_SHARD_COUNT } from '../upload/material-router.js';

const RADIUS = 1.45;

let shardGroup = null;
let shardRecords = [];
let offMaterials = null;

function getDesiredShardCount() {
  return Math.max(
    MIN_SHARD_COUNT,
    window.SM?.materialAssignments?.length || 0,
    window.SM?.materials?.length || 0,
  );
}

function getWidthSegments(totalCount) {
  return totalCount > 18 ? 10 : totalCount > 12 ? 14 : 18;
}

function createMaterial(index) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffffff'),
    transparent: true,
    opacity: 0.98,
    side: THREE.DoubleSide,
  });
}

function createShard(index, totalCount) {
  const phiLength = (Math.PI * 2) / totalCount;
  const phiStart = index * phiLength;
  const geometry = new THREE.SphereGeometry(
    RADIUS,
    getWidthSegments(totalCount),
    22,
    phiStart,
    phiLength,
    0.12,
    Math.PI - 0.24,
  );
  const material = createMaterial(index);
  const mesh = new THREE.Mesh(geometry, material);
  const midPhi = phiStart + phiLength / 2;
  const verticalBias = ((index % 4) - 1.5) * 0.12;
  const direction = new THREE.Vector3(
    Math.cos(midPhi),
    verticalBias,
    Math.sin(midPhi),
  ).normalize();
  const explodedPosition = direction.clone().multiplyScalar(2.1 + (index % 3) * 0.16);

  return {
    id: `shard-${index}`,
    index,
    mesh,
    material,
    uvRegion: { u0: index / totalCount, v0: 0, u1: (index + 1) / totalCount, v1: 1 },
    basePosition: new THREE.Vector3(0, 0, 0),
    explodedPosition,
  };
}

function ensureGroup() {
  if (shardGroup) return shardGroup;

  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (!root) {
    throw new Error('render3d.scene root group is not ready');
  }

  shardGroup = new THREE.Group();
  shardGroup.name = 'shard-group';
  shardGroup.visible = false;
  root.add(shardGroup);
  return shardGroup;
}

function disposeRecords() {
  if (!shardGroup) return;

  shardRecords.forEach((record) => {
    record.mesh.geometry?.dispose?.();
    record.mesh.material?.dispose?.();
    shardGroup.remove(record.mesh);
  });

  shardRecords = [];
}

function rebuildShards(forceCount = getDesiredShardCount()) {
  const group = ensureGroup();
  disposeRecords();

  shardRecords = Array.from({ length: forceCount }, (_, index) => createShard(index, forceCount));
  shardRecords.forEach((record) => {
    record.mesh.position.copy(record.explodedPosition);
    record.mesh.userData.shardId = record.id;
    group.add(record.mesh);
  });

  window.SM.shards = shardRecords;
  window.SM.bus.emit('shards:rebuilt', { count: forceCount, shards: shardRecords });
  return shardRecords;
}

function createFromTopology() {
  return shardRecords.length ? shardRecords : rebuildShards();
}

function animateShards(duration, positionResolver) {
  ensureGroup();
  if (!shardRecords.length) createFromTopology();

  shardGroup.visible = true;
  window.SM.modules.render3d.sphereShell?.setVisible?.(true);

  const startedAt = performance.now();
  const startPositions = shardRecords.map((record) => record.mesh.position.clone());

  return new Promise((resolve) => {
    function tick(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      shardRecords.forEach((record, index) => {
        const target = positionResolver(record);
        record.mesh.position.lerpVectors(startPositions[index], target, eased);
      });

      if (progress < 1) {
        window.requestAnimationFrame(tick);
      } else {
        resolve();
      }
    }

    window.requestAnimationFrame(tick);
  });
}

function explode(duration = 360) {
  return animateShards(duration, (record) => record.explodedPosition);
}

function aggregate(duration = 1380) {
  return animateShards(duration, (record) => record.basePosition);
}

function rotateBy(dx, dy) {
  if (!shardGroup) return;

  shardGroup.rotation.y += dx;
  shardGroup.rotation.x = THREE.MathUtils.clamp(shardGroup.rotation.x + dy, -0.8, 0.8);
  window.SM.sphereRotation = {
    x: shardGroup.rotation.x,
    y: shardGroup.rotation.y,
  };
}

function rotateTo(x, y) {
  if (!shardGroup) return;
  shardGroup.rotation.x = x;
  shardGroup.rotation.y = y;
  window.SM.sphereRotation = { x, y };
}

function getShards() {
  return shardRecords;
}

function getShardById(id) {
  return shardRecords.find((record) => record.id === id);
}

function setVisible(visible) {
  if (shardGroup) shardGroup.visible = visible;
}

function init() {
  rebuildShards();
  offMaterials = window.SM.bus.on('materials:updated', ({ assignments }) => {
    const nextCount = Math.max(MIN_SHARD_COUNT, assignments?.length || 0);
    if (nextCount !== shardRecords.length) {
      rebuildShards(nextCount);
    } else {
      window.SM.bus.emit('shards:rebuilt', { count: nextCount, shards: shardRecords });
    }
  });
}

function destroy() {
  offMaterials?.();
  offMaterials = null;
  if (!shardGroup) return;

  disposeRecords();
  shardGroup.parent?.remove?.(shardGroup);
  shardGroup = null;
}

export {
  init,
  destroy,
  createFromTopology,
  rebuildShards,
  explode,
  aggregate,
  rotateBy,
  rotateTo,
  getShards,
  getShardById,
  setVisible,
};
