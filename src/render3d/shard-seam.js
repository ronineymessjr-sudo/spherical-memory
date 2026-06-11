import * as THREE from 'three';

let seamGroup = null;
let offRebuild = null;
let offMood = null;
let syncFrame = 0;
let activeShardId = null;
let pulsePhase = 0;
let activeMood = 'wistful';

function moodPalette(mood) {
  switch (mood) {
    case 'vivid':
      return { crack: '#ff8d6a', focus: '#ffe28f', neutralOpacity: 0.38, activeOpacity: 0.92 };
    case 'wistful':
      return { crack: '#7bcfff', focus: '#ffe28f', neutralOpacity: 0.34, activeOpacity: 0.9 };
    case 'healing':
      return { crack: '#5ee2c2', focus: '#fff3a8', neutralOpacity: 0.32, activeOpacity: 0.88 };
    default:
      return moodPalette('wistful');
  }
}

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
  const palette = moodPalette(activeMood);

  shards.forEach((record) => {
    // Lower angle threshold => more edges => jagged outlines.
    const geometry = new THREE.EdgesGeometry(record.mesh.geometry, 8);
    const material = new THREE.LineBasicMaterial({
      color: palette.crack,
      transparent: true,
      opacity: palette.neutralOpacity,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
    });
    const lines = new THREE.LineSegments(geometry, material);
    lines.position.copy(record.mesh.position);
    lines.rotation.copy(record.mesh.rotation);
    lines.scale.setScalar(1.0045);
    lines.renderOrder = 4;
    lines.userData.shardId = record.id;
    group.add(lines);
  });

  setColor(activeShardId);
}

function sync() {
  if (!seamGroup) return;
  pulsePhase += 0.028;
  const shards = window.SM.modules.render3d?.shardMesh?.getShards?.() ?? [];
  const palette = moodPalette(activeMood);

  seamGroup.children.forEach((line) => {
    const shard = shards.find((record) => record.id === line.userData.shardId);
    if (!shard) return;

    const isActive = !!activeShardId && line.userData.shardId === activeShardId;
    line.position.copy(shard.mesh.position);
    line.quaternion.copy(shard.mesh.quaternion);
    line.material.opacity = isActive
      ? palette.activeOpacity + Math.sin(pulsePhase) * 0.08
      : palette.neutralOpacity + Math.sin(pulsePhase + shard.index * 0.45) * 0.05;
  });
}

function setEnabled(visible = true) {
  if (seamGroup) seamGroup.visible = visible;
}

function setColor(nextActiveShardId) {
  activeShardId = nextActiveShardId;
  if (!seamGroup) return;

  const palette = moodPalette(activeMood);

  seamGroup.children.forEach((line) => {
    const isActive = activeShardId && line.userData.shardId === activeShardId;
    line.material.color.set(isActive ? palette.focus : palette.crack);
    line.material.opacity = isActive ? palette.activeOpacity : palette.neutralOpacity;
  });
}

function setMood(name) {
  if (!name) return;
  activeMood = name;
  rebuild();
}

function init() {
  rebuild();
  offRebuild = window.SM.bus.on('shards:rebuilt', () => {
    // Defer to next frame so shard-mesh has fully populated shardRecords and
    // shard.mesh.geometry is the post-rebuild geometry.
    window.requestAnimationFrame(() => rebuild());
  });
  offMood = window.SM.bus.on('mood:change', ({ name }) => {
    setMood(name);
  });

  const syncLoop = () => {
    sync();
    syncFrame = window.requestAnimationFrame(syncLoop);
  };

  syncLoop();
}

function destroy() {
  offRebuild?.();
  offMood?.();
  offRebuild = null;
  offMood = null;
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
  setMood,
};
