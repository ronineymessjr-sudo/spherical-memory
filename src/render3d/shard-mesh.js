import * as THREE from 'three';

const SHARD_COUNT = 6;
const RADIUS = 1.45;

let shardGroup = null;
let shardRecords = [];

function createMaterial(index) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(`hsl(${205 + index * 18} 70% 68%)`),
    roughness: 0.42,
    metalness: 0.08,
    transparent: true,
    opacity: 1,
  });
}

function createShard(index) {
  const phiLength = (Math.PI * 2) / SHARD_COUNT;
  const phiStart = index * phiLength;
  const geometry = new THREE.SphereGeometry(RADIUS, 32, 24, phiStart, phiLength, 0.18, Math.PI - 0.36);
  const material = createMaterial(index);
  const mesh = new THREE.Mesh(geometry, material);
  const midPhi = phiStart + phiLength / 2;
  const direction = new THREE.Vector3(Math.cos(midPhi), 0, Math.sin(midPhi)).normalize();
  const explodedPosition = direction.clone().multiplyScalar(2.1);
  explodedPosition.y = index % 2 === 0 ? 0.3 : -0.3;

  return {
    id: `shard-${index}`,
    index,
    mesh,
    material,
    uvRegion: { u0: index / SHARD_COUNT, v0: 0, u1: (index + 1) / SHARD_COUNT, v1: 1 },
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

function createFromTopology() {
  if (shardRecords.length) return shardRecords;

  const group = ensureGroup();
  shardRecords = Array.from({ length: SHARD_COUNT }, (_, index) => createShard(index));

  shardRecords.forEach((record) => {
    record.mesh.position.copy(record.explodedPosition);
    group.add(record.mesh);
  });

  window.SM.shards = shardRecords;
  return shardRecords;
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

function explode(duration = 320) {
  return animateShards(duration, (record) => record.explodedPosition);
}

function aggregate(duration = 1200) {
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
  createFromTopology();
}

function destroy() {
  if (!shardGroup) return;

  shardRecords.forEach((record) => {
    record.mesh.geometry?.dispose?.();
    record.mesh.material?.dispose?.();
    shardGroup.remove(record.mesh);
  });

  shardRecords = [];
  shardGroup.parent?.remove?.(shardGroup);
  shardGroup = null;
}

export {
  init,
  destroy,
  createFromTopology,
  explode,
  aggregate,
  rotateBy,
  rotateTo,
  getShards,
  getShardById,
  setVisible,
};
