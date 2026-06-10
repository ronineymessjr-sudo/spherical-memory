import * as THREE from 'three';

let seamGroup = null;
let offRebuild = null;
let syncFrame = 0;
let activeShardId = null;
let pulsePhase = 0;

function ensureGroup() {
  if (seamGroup) return seamGroup;

  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (!root) return null;

  seamGroup = new THREE.Group();
  seamGroup.name = 'shard-seams';
  root.add(seamGroup);
  return seamGroup;
}

function clearSeams() {
  if (!seamGroup) return;

  while (seamGroup.children.length) {
    const child = seamGroup.children[0];
    child.geometry?.dispose?.();
    child.material?.dispose?.();
    seamGroup.remove(child);
  }
}

function rebuild() {
  const group = ensureGroup();
  if (!group) return;
  clearSeams();

  const shards = window.SM.modules.render3d?.shardMesh?.getShards?.() ?? [];
  shards.forEach((record) => {
    const geometry = new THREE.EdgesGeometry(record.mesh.geometry, 15);
    const material = new THREE.LineBasicMaterial({
      color: '#7bcfff',
      transparent: true,
      opacity: 0.46,
      blending: THREE.AdditiveBlending,
    });
    const lines = new THREE.LineSegments(geometry, material);
    lines.position.copy(record.mesh.position);
    lines.rotation.copy(record.mesh.rotation);
    lines.scale.setScalar(1.0025);
    lines.userData.shardId = record.id;
    group.add(lines);
  });

  setColor(activeShardId);
}

function sync() {
  if (!seamGroup) return;
  pulsePhase += 0.035;
  const shards = window.SM.modules.render3d?.shardMesh?.getShards?.() ?? [];

  seamGroup.children.forEach((line) => {
    const shard = shards.find((record) => record.id === line.userData.shardId);
    if (!shard) return;

    const isActive = !!activeShardId && line.userData.shardId === activeShardId;
    line.position.copy(shard.mesh.position);
    line.rotation.copy(shard.mesh.rotation);
    line.material.opacity = isActive
      ? 0.78 + Math.sin(pulsePhase) * 0.12
      : 0.34 + Math.sin(pulsePhase + shard.index * 0.45) * 0.06;
  });
}

function setEnabled(visible = true) {
  if (seamGroup) seamGroup.visible = visible;
}

function setColor(nextActiveShardId) {
  activeShardId = nextActiveShardId;
  if (!seamGroup) return;

  seamGroup.children.forEach((line) => {
    const isActive = activeShardId && line.userData.shardId === activeShardId;
    line.material.color.set(isActive ? '#ffe28f' : '#7bcfff');
    line.material.opacity = isActive ? 0.9 : 0.42;
  });
}

function init() {
  rebuild();
  offRebuild = window.SM.bus.on('shards:rebuilt', () => {
    rebuild();
  });

  const syncLoop = () => {
    sync();
    syncFrame = window.requestAnimationFrame(syncLoop);
  };

  syncLoop();
}

function destroy() {
  offRebuild?.();
  offRebuild = null;
  if (syncFrame) {
    window.cancelAnimationFrame(syncFrame);
    syncFrame = 0;
  }
  clearSeams();
  seamGroup?.parent?.remove?.(seamGroup);
  seamGroup = null;
  activeShardId = null;
  pulsePhase = 0;
}

export {
  init,
  destroy,
  setEnabled,
  setColor,
};
