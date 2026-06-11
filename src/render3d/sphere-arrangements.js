// Sphere arrangements — alternative layouts for the shard cluster.
// Each arrangement returns a `slotFor(index, total, direction)` function that
// yields a THREE.Vector3 position and Euler rotation. The shard mesh reuses
// its base direction as a hint so the layout still feels "of" the sphere.

import * as THREE from 'three';

const RADIUS = 1.45;
const tmpEuler = new THREE.Euler();

function buildSphereSlot(index, total) {
  // Fibonacci sphere distribution — gives a uniform, calm arrangement.
  const golden = Math.PI * (3 - Math.sqrt(5));
  const t = (index + 0.5) / Math.max(1, total);
  const y = 1 - t * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = index * golden;

  const position = new THREE.Vector3(
    Math.cos(theta) * r * RADIUS,
    y * RADIUS,
    Math.sin(theta) * r * RADIUS,
  );
  const rotation = new THREE.Euler(0, 0, 0);
  return { position, rotation };
}

function buildRingSlot(index, total) {
  // Two stacked rings, alternating shards between them. Feels like a planetary
  // belt with two distinct orbits.
  const ringCount = 2;
  const ring = index % ringCount;
  const perRing = Math.ceil(total / ringCount);
  const localIndex = Math.floor(index / ringCount);
  const angle = (localIndex / perRing) * Math.PI * 2;
  const ringTilt = ring === 0 ? 0.05 : -0.45;
  const ringScale = ring === 0 ? 1.0 : 0.86;
  const heightOffset = ring === 0 ? 0.18 : -0.22;

  const x = Math.cos(angle) * RADIUS * 1.18 * ringScale;
  const z = Math.sin(angle) * RADIUS * 1.18 * ringScale;
  const y = heightOffset + Math.sin(angle * 2) * 0.08;

  const position = new THREE.Vector3(x, y, z);
  const rotation = new THREE.Euler(ringTilt, angle + Math.PI / 2, 0);
  return { position, rotation };
}

function buildNebulaSlot(index, total) {
  // Belt + halo: 60% of shards on a wide belt, 40% in an outer halo.
  // Creates a "memory nebula" with depth and breathing space.
  const onBelt = index / total < 0.6;
  const angle = (index / total) * Math.PI * 2 * (onBelt ? 1 : 1.6);
  const radial = onBelt ? 1.08 : 1.42;
  const y = onBelt
    ? Math.sin(angle * 2) * 0.22
    : (Math.sin(index * 0.97) - 0.5) * 0.85;

  const position = new THREE.Vector3(
    Math.cos(angle) * RADIUS * radial,
    y,
    Math.sin(angle) * RADIUS * radial,
  );
  const rotation = new THREE.Euler(
    onBelt ? 0.1 : 0.55,
    angle + Math.PI / 2,
    onBelt ? 0 : Math.sin(index) * 0.4,
  );
  return { position, rotation };
}

function buildWhirlpoolSlot(index, total) {
  // Spiral vortex with 2.5 turns. Shards nearer the top are higher and more
  // outward; the spiral tightens as it descends.
  const t = index / Math.max(1, total);
  const turns = 2.5;
  const angle = t * Math.PI * 2 * turns;
  const radiusFalloff = 1.32 - t * 0.7;
  const y = 0.95 - t * 1.9;
  const wobble = Math.sin(t * 14) * 0.05;

  const position = new THREE.Vector3(
    Math.cos(angle) * RADIUS * radiusFalloff + wobble,
    y,
    Math.sin(angle) * RADIUS * radiusFalloff + wobble,
  );
  const rotation = new THREE.Euler(0.2, angle + Math.PI / 2, Math.sin(t * 9) * 0.5);
  return { position, rotation };
}

function buildTimelineSlot(index, total, direction) {
  // Walk the sphere along a great circle in `direction` order. Shards line up
  // along the latitude that the original direction implies.
  const t = (index + 0.5) / Math.max(1, total);
  const angle = t * Math.PI * 2;
  const lat = Math.sin(t * Math.PI) * 0.55; // bulge slightly upward then back

  const x = Math.cos(angle) * RADIUS * (1 + lat * 0.18);
  const z = Math.sin(angle) * RADIUS * (1 + lat * 0.18);
  const y = lat;

  // Default direction tilts shards so their outward face is toward the camera path.
  const lookAt = new THREE.Vector3(Math.cos(angle) * 2, lat, Math.sin(angle) * 2);
  const dummy = new THREE.Object3D();
  dummy.position.set(x, y, z);
  dummy.lookAt(lookAt);
  const position = new THREE.Vector3(x, y, z);
  const rotation = new THREE.Euler(dummy.rotation.x, dummy.rotation.y, dummy.rotation.z);
  return { position, rotation };
}

const ARRANGEMENTS = {
  sphere: { label: 'sphere', slotFor: buildSphereSlot },
  ring: { label: 'ring', slotFor: buildRingSlot },
  nebula: { label: 'nebula', slotFor: buildNebulaSlot },
  whirlpool: { label: 'whirlpool', slotFor: buildWhirlpoolSlot },
  timeline: { label: 'timeline', slotFor: buildTimelineSlot },
};

function getArrangement(name = 'sphere') {
  return ARRANGEMENTS[name] ?? ARRANGEMENTS.sphere;
}

function listArrangements() {
  return Object.keys(ARRANGEMENTS);
}

export {
  getArrangement,
  listArrangements,
};
