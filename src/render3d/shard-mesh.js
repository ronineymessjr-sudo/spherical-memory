import * as THREE from 'three';
import { MIN_SHARD_COUNT } from '../upload/material-router.js';
import { getArrangement } from './sphere-arrangements.js';

const BASE_RADIUS = 1.45;

let shardGroup = null;
let shardRecords = [];
let topologySeed = Math.random() * 1e6;
let offMaterials = null;
let offArrangement = null;
let offMood = null;

// Per-shard live state populated by the renderer tick.
const liveState = {
  arrangement: 'sphere',
  mood: 'wistful',
  timeline: false,
  focusId: null,
};

function getDesiredShardCount() {
  return Math.max(
    MIN_SHARD_COUNT,
    window.SM?.materialAssignments?.length || 0,
    window.SM?.materials?.length || 0,
  );
}

function seeded(seed) {
  const value = Math.sin((seed + topologySeed) * 127.1) * 43758.5453123;
  return value - Math.floor(value);
}

function createMaterial(mood = liveState.mood) {
  const palette = moodPalette(mood);
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff'),
    transparent: true,
    opacity: 0.96,
    side: THREE.DoubleSide,
    roughness: 0.38,
    metalness: 0.05,
    clearcoat: 0.55,
    clearcoatRoughness: 0.34,
    transmission: 0.18,
    thickness: 0.22,
    ior: 1.32,
    sheen: 0.4,
    sheenColor: new THREE.Color(palette.sheen),
    emissive: new THREE.Color(palette.emissive),
    emissiveIntensity: 0.16,
    envMapIntensity: 0.9,
  });
  material.userData.baseOpacity = 0.96;
  material.userData.baseEmissiveIntensity = 0.16;
  material.userData.palette = palette;
  return material;
}

function moodPalette(mood) {
  switch (mood) {
    case 'vivid': // 热烈
      return {
        sheen: '#ffd0a8',
        emissive: '#3a1416',
        crack: '#ff8d6a',
        focus: '#ffe28f',
        particleInner: '#ff7c8a',
        particleOuter: '#ffd28a',
      };
    case 'wistful': // 怀旧
      return {
        sheen: '#9ed5ff',
        emissive: '#0f1c32',
        crack: '#7bcfff',
        focus: '#ffe28f',
        particleInner: '#8fd6ff',
        particleOuter: '#a5b6ff',
      };
    case 'healing': // 治愈
      return {
        sheen: '#a8e6cf',
        emissive: '#13312a',
        crack: '#5ee2c2',
        focus: '#fff3a8',
        particleInner: '#7be2c8',
        particleOuter: '#9ed5ff',
      };
    default:
      return moodPalette('wistful');
  }
}

function getBaseDetail(totalCount) {
  if (totalCount > 28) return 5;
  if (totalCount > 18) return 6;
  if (totalCount > 10) return 7;
  return 8;
}

function getGapFactor(totalCount) {
  // More total shards => less gap, but base gap is bigger than the previous 0.16-0.22
  if (totalCount <= 6) return 0.32;
  if (totalCount <= 10) return 0.30;
  if (totalCount <= 16) return 0.28;
  if (totalCount <= 24) return 0.24;
  return 0.20;
}

// Generate fracture seeds (great-circle arcs and per-shard seed centers) on the sphere.
// The trick: we do NOT do a smooth Voronoi. Instead, we use a *starburst* of great-circle
// cracks radiating from a small set of impact points, then assign triangles by
// shortest broken-line distance with random breaks on long edges.
function getFractureSeeds(totalCount) {
  const impactCount = Math.max(4, Math.min(7, Math.round(totalCount * 0.45)));
  const impacts = [];

  for (let i = 0; i < impactCount; i += 1) {
    const phi = Math.acos(2 * seeded(totalCount * 91 + i * 17) - 1);
    const theta = 2 * Math.PI * seeded(totalCount * 71 + i * 13);
    const dir = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta),
    ).normalize();
    impacts.push({
      direction: dir,
      // 4-6 radial crack lines per impact.
      crackCount: 4 + Math.floor(seeded(totalCount * 41 + i * 5) * 3),
      reach: 0.9 + seeded(totalCount * 33 + i * 7) * 0.4,
    });
  }

  // Build shard seed centers by warping impact directions and offsetting.
  const centers = [];
  for (let i = 0; i < totalCount; i += 1) {
    const impact = impacts[i % impacts.length];
    const tangentA = new THREE.Vector3(-impact.direction.z, 0, impact.direction.x);
    if (tangentA.lengthSq() < 0.0001) tangentA.set(1, 0, 0);
    tangentA.normalize();
    const tangentB = new THREE.Vector3().crossVectors(impact.direction, tangentA).normalize();

    const a = (seeded(totalCount * 19 + i * 7) - 0.5) * 0.7;
    const b = (seeded(totalCount * 29 + i * 11) - 0.5) * 0.7;
    const dir = impact.direction
      .clone()
      .addScaledVector(tangentA, a)
      .addScaledVector(tangentB, b)
      .normalize();

    centers.push({ direction: dir, impactIndex: i % impacts.length });
  }
  return { impacts, centers };
}

function vertexKey(x, y, z) {
  return `${x.toFixed(5)}|${y.toFixed(5)}|${z.toFixed(5)}`;
}

function createTriangleRecord(attributes, triangleIndex) {
  const position = attributes.position;
  const normal = attributes.normal;
  const uv = attributes.uv;
  const offset = triangleIndex * 9;
  const uvOffset = triangleIndex * 6;
  const positions = Array.from(position.array.slice(offset, offset + 9));
  const normals = Array.from(normal.array.slice(offset, offset + 9));
  const uvs = Array.from(uv.array.slice(uvOffset, uvOffset + 6));
  const a = new THREE.Vector3(positions[0], positions[1], positions[2]);
  const b = new THREE.Vector3(positions[3], positions[4], positions[5]);
  const c = new THREE.Vector3(positions[6], positions[7], positions[8]);

  return {
    index: triangleIndex,
    center: a.clone().add(b).add(c).multiplyScalar(1 / 3).normalize(),
    positions,
    normals,
    uvs,
    vertexKeys: [
      vertexKey(positions[0], positions[1], positions[2]),
      vertexKey(positions[3], positions[4], positions[5]),
      vertexKey(positions[6], positions[7], positions[8]),
    ],
  };
}

function buildAdjacency(triangles) {
  const edgeMap = new Map();
  const adjacency = triangles.map(() => new Set());

  triangles.forEach((triangle, triangleIndex) => {
    const [a, b, c] = triangle.vertexKeys;
    const edges = [[a, b], [b, c], [c, a]];

    edges.forEach(([left, right]) => {
      const key = [left, right].sort().join('::');
      const bucket = edgeMap.get(key) ?? [];
      bucket.push(triangleIndex);
      edgeMap.set(key, bucket);
    });
  });

  edgeMap.forEach((triangleIndices) => {
    if (triangleIndices.length < 2) return;
    triangleIndices.forEach((leftIndex) => {
      triangleIndices.forEach((rightIndex) => {
        if (leftIndex !== rightIndex) {
          adjacency[leftIndex].add(rightIndex);
        }
      });
    });
  });

  return adjacency;
}

// Randomly break long edges — this is the key to jagged, not-voronoi shards.
// Returns a Set of vertex keys that should be DUPLICATED into the relevant
// triangles so edges don't share vertices across shard boundaries.
function buildBrokenEdges(triangles, fracture) {
  const broken = new Set();
  triangles.forEach((triangle, triangleIndex) => {
    triangle.vertexKeys.forEach((key) => {
      const hash = seeded(triangleIndex * 7 + key.charCodeAt(2) * 3 + fracture.length);
      // ~22% of long edges get broken so neighboring shards no longer share clean lines.
      if (hash < 0.22) {
        broken.add(`${triangleIndex}::${key}`);
      }
    });
  });
  return broken;
}

function getSeedTriangleIndices(triangles, fracture) {
  const used = new Set();
  return fracture.centers.map((seed, seedIndex) => {
    let bestTriangleIndex = 0;
    let bestScore = -Infinity;
    triangles.forEach((triangle, triangleIndex) => {
      if (used.has(triangleIndex)) return;
      const cohesion = triangle.center.dot(seed.direction);
      const noise = seeded(seedIndex * 31 + triangleIndex * 5) * 0.5;
      const score = cohesion * 0.55 + noise;
      if (score > bestScore) {
        bestScore = score;
        bestTriangleIndex = triangleIndex;
      }
    });
    used.add(bestTriangleIndex);
    return bestTriangleIndex;
  });
}

function buildRegionTargets(totalCount, triangleCount) {
  const weights = Array.from({ length: totalCount }, (_, index) => (
    0.65 + seeded(totalCount * 43 + index * 13) * 0.55
  ));
  const weightSum = weights.reduce((sum, value) => sum + value, 0);

  const raw = weights.map((value) => Math.max(1, Math.round((value / weightSum) * triangleCount)));
  let diff = triangleCount - raw.reduce((sum, value) => sum + value, 0);
  const counts = [...raw];
  while (diff !== 0) {
    const index = diff > 0
      ? counts.indexOf(Math.min(...counts))
      : counts.indexOf(Math.max(...counts));
    if (diff > 0) {
      counts[index] += 1;
      diff -= 1;
    } else if (counts[index] > 1) {
      counts[index] -= 1;
      diff += 1;
    } else {
      break;
    }
  }
  return counts;
}

function assignTriangleToRegion(triangleIndex, regionIndex, assignments, counts, frontiers, adjacency) {
  assignments[triangleIndex] = regionIndex;
  counts[regionIndex] += 1;
  frontiers[regionIndex].delete(triangleIndex);

  adjacency[triangleIndex].forEach((neighborIndex) => {
    if (assignments[neighborIndex] === -1) {
      frontiers[regionIndex].add(neighborIndex);
    }
  });
}

function growRegions(triangles, adjacency, totalCount, fracture) {
  const triangleCount = triangles.length;
  const assignments = Array(triangleCount).fill(-1);
  const counts = Array(totalCount).fill(0);
  const frontiers = Array.from({ length: totalCount }, () => new Set());
  const seedTriangleIndices = getSeedTriangleIndices(triangles, fracture);
  const regionTargets = buildRegionTargets(totalCount, triangleCount);
  const seedDirections = seedTriangleIndices.map((triangleIndex) => triangles[triangleIndex].center.clone());

  seedTriangleIndices.forEach((triangleIndex, regionIndex) => {
    assignTriangleToRegion(triangleIndex, regionIndex, assignments, counts, frontiers, adjacency);
  });

  while (assignments.includes(-1)) {
    let regionIndex = -1;
    let smallestFillRatio = Infinity;

    frontiers.forEach((frontier, currentRegionIndex) => {
      if (!frontier.size) return;
      const fillRatio = counts[currentRegionIndex] / Math.max(regionTargets[currentRegionIndex], 1);
      if (fillRatio < smallestFillRatio) {
        smallestFillRatio = fillRatio;
        regionIndex = currentRegionIndex;
      }
    });

    if (regionIndex === -1) {
      const orphanIndex = assignments.findIndex((value) => value === -1);
      if (orphanIndex === -1) break;
      let bestRegionIndex = 0;
      let bestScore = -Infinity;
      seedDirections.forEach((seedDirection, currentRegionIndex) => {
        const score = triangles[orphanIndex].center.dot(seedDirection);
        if (score > bestScore) {
          bestScore = score;
          bestRegionIndex = currentRegionIndex;
        }
      });
      assignTriangleToRegion(orphanIndex, bestRegionIndex, assignments, counts, frontiers, adjacency);
      continue;
    }

    let bestTriangleIndex = -1;
    let bestScore = -Infinity;
    const currentSeedDirection = seedDirections[regionIndex];

    Array.from(frontiers[regionIndex]).forEach((triangleIndex) => {
      if (assignments[triangleIndex] !== -1) {
        frontiers[regionIndex].delete(triangleIndex);
        return;
      }
      const cohesion = triangles[triangleIndex].center.dot(currentSeedDirection);
      const jagged = seeded(regionIndex * 97 + triangleIndex * 17) * 0.95;
      const stretch = seeded(regionIndex * 59 + triangleIndex * 29) * 0.35;
      const radiusBias = triangles[triangleIndex].center.length();
      // bias growth toward neighbors that are *near* the seed but not too close, so
      // the result has clear shards with crisp boundaries instead of amoeba blobs.
      const score = cohesion * 0.55 + jagged - stretch - Math.abs(radiusBias - 1) * 0.05;
      if (score > bestScore) {
        bestScore = score;
        bestTriangleIndex = triangleIndex;
      }
    });

    if (bestTriangleIndex === -1) {
      frontiers[regionIndex].clear();
      continue;
    }

    assignTriangleToRegion(bestTriangleIndex, regionIndex, assignments, counts, frontiers, adjacency);
  }

  return assignments;
}

function buildGeometryFromTriangles(triangles, brokenEdges, shardIndex) {
  // Each shard is built by:
  //   1) Take the front face = union of the region's triangles (still used for
  //      texture mapping so the image maps seamlessly).
  //   2) Walk the perimeter edges and build a `THREE.Shape` so we can
  //      `ExtrudeGeometry` the shard with real depth -> 真正有侧面的碎玻璃.
  //   3) Project perimeter into 2D using a local tangent basis so the
  //      extrusion is planar; depth is along the shard outward normal.
  //
  // Net effect: each shard now casts a real shadow on its neighbor, has a
  // distinct silhouette, and the gaps between shards read as physical space.

  const center = new THREE.Vector3();
  triangles.forEach((triangle) => {
    center.add(new THREE.Vector3(triangle.positions[0], triangle.positions[1], triangle.positions[2]));
    center.add(new THREE.Vector3(triangle.positions[3], triangle.positions[4], triangle.positions[5]));
    center.add(new THREE.Vector3(triangle.positions[6], triangle.positions[7], triangle.positions[8]));
  });
  center.divideScalar(triangles.length * 3);
  const direction = center.clone().normalize();

  // Local tangent basis for 3D -> 2D projection.
  const normal = direction.clone();
  const tangentU = new THREE.Vector3(-normal.z, 0, normal.x);
  if (tangentU.lengthSq() < 0.0001) tangentU.set(1, 0, 0);
  tangentU.normalize();
  const tangentV = new THREE.Vector3().crossVectors(normal, tangentU).normalize();
  const project2D = (v) => new THREE.Vector2(v.dot(tangentU), v.dot(tangentV));
  const back2D = (u, v) => tangentU.clone().multiplyScalar(u).addScaledVector(tangentV, v);

  // 1) Front-face positions/uvs (image mapping). 3D world space.
  const frontPositions = [];
  const frontUVs = [];
  // Per-vertex 3D for the front face = average of the 3 triangle vertices,
  // but stored as one quad per pair (we'll keep a triangle list to feed
  // extrude + custom UVs).
  triangles.forEach((triangle) => {
    const verts = [
      new THREE.Vector3(triangle.positions[0], triangle.positions[1], triangle.positions[2]),
      new THREE.Vector3(triangle.positions[3], triangle.positions[4], triangle.positions[5]),
      new THREE.Vector3(triangle.positions[6], triangle.positions[7], triangle.positions[8]),
    ].map((vertex, vi) => {
      const key = triangle.vertexKeys[vi];
      if (brokenEdges.has(`${triangle.index}::${key}`)) {
        const outward = vertex.clone().normalize();
        const noise = (seeded(shardIndex * 53 + triangle.index * 11 + vi * 7) - 0.5) * 0.06;
        return vertex.clone().addScaledVector(outward, 0.01 + Math.abs(noise));
      }
      return vertex;
    });
    verts.forEach((v) => frontPositions.push(v.x, v.y, v.z));
    frontUVs.push(...triangle.uvs);
  });

  // 2) Walk perimeter edges.
  const edgeMap = new Map();
  triangles.forEach((triangle) => {
    const keys = triangle.vertexKeys;
    [[0, 1], [1, 2], [2, 0]].forEach(([a, b]) => {
      const sorted = [keys[a], keys[b]].sort();
      const key = sorted.join('::');
      if (!edgeMap.has(key)) edgeMap.set(key, { a: sorted[0], b: sorted[1], triCount: 0 });
      edgeMap.get(key).triCount += 1;
    });
  });

  // Vertex lookup by key -> Vector3.
  const vertexLookup = new Map();
  triangles.forEach((triangle) => {
    triangle.vertexKeys.forEach((k, vi) => {
      if (!vertexLookup.has(k)) {
        const v = new THREE.Vector3(
          triangle.positions[vi * 3],
          triangle.positions[vi * 3 + 1],
          triangle.positions[vi * 3 + 2],
        );
        vertexLookup.set(k, v);
      }
    });
  });

  // Perimeter = edges with triCount === 1.
  const perimeterEdges = [];
  edgeMap.forEach((entry) => {
    if (entry.triCount === 1) {
      perimeterEdges.push([vertexLookup.get(entry.a), vertexLookup.get(entry.b)]);
    }
  });

  if (perimeterEdges.length < 3) {
    // Tiny shard (single triangle) — fall back to flat geometry.
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(frontPositions, 3));
    const uvs = frontUVs.length === frontPositions.length / 3 * 2
      ? frontUVs
      : new Array(frontPositions.length / 3 * 2).fill(0);
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return { geometry, direction };
  }

  // 3) Order perimeter into a closed loop using closest endpoint matching.
  const loop = [perimeterEdges[0][0].clone(), perimeterEdges[0][1].clone()];
  const used = new Set([0]);
  const remaining = new Set(perimeterEdges.keys());
  remaining.delete(0);
  while (remaining.size) {
    const last = loop[loop.length - 1];
    let bestIdx = -1;
    let bestDist = Infinity;
    let bestSwap = false;
    remaining.forEach((idx) => {
      const [a, b] = perimeterEdges[idx];
      const dA = a.distanceTo(last);
      const dB = b.distanceTo(last);
      if (dA < bestDist) { bestDist = dA; bestIdx = idx; bestSwap = false; }
      if (dB < bestDist) { bestDist = dB; bestIdx = idx; bestSwap = true; }
    });
    if (bestIdx < 0) break;
    const [a, b] = perimeterEdges[bestIdx];
    loop.push((bestSwap ? a : b).clone());
    remaining.delete(bestIdx);
  }
  // Drop the duplicated last point if it equals the first.
  if (loop.length > 2 && loop[loop.length - 1].distanceTo(loop[0]) < 0.001) {
    loop.pop();
  }

  // 4) Project loop into 2D for `THREE.Shape`.
  const shape2D = loop.map((v) => project2D(v));
  // Recenter so the Shape is around origin (extrude is in local 2D space).
  const center2D = shape2D.reduce((acc, p) => acc.add(p), new THREE.Vector2()).divideScalar(shape2D.length);
  const localShape = shape2D.map((p) => p.clone().sub(center2D));

  // 5) Extrude.
  const shardDepth = 0.05 + seeded(shardIndex * 7) * 0.04; // 0.05-0.09
  const shape = new THREE.Shape(localShape);
  const extrude = new THREE.ExtrudeGeometry(shape, {
    depth: shardDepth,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 1,
    steps: 1,
    curveSegments: 1,
  });
  // ExtrudeGeometry is in local 2D plane (XY); we need to map it back into 3D.
  // We do that by re-encoding positions using tangentU/tangentV + normal*z.
  const posAttr = extrude.getAttribute('position');
  const newPositions = new Float32Array(posAttr.count * 3);
  for (let i = 0; i < posAttr.count; i += 1) {
    const lx = posAttr.getX(i);
    const ly = posAttr.getY(i);
    const lz = posAttr.getZ(i);
    // local x,y -> world tangent basis
    const world = tangentU.clone().multiplyScalar(lx)
      .addScaledVector(tangentV, ly)
      .add(center);
    // depth in lz direction -> along normal. We want the *back* face at lz=0
    // to sit on the original sphere surface (so it doesn't poke inward), and
    // the front face pushed outward by `shardDepth`.
    world.addScaledVector(normal, lz);
    newPositions[i * 3] = world.x;
    newPositions[i * 3 + 1] = world.y;
    newPositions[i * 3 + 2] = world.z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));

  // Generate UVs that map the image onto the FRONT face of the shard, leaving
  // the side+back faces with a soft material-driven shade. We approximate by
  // mapping uv = (front 2D coord) / (sphere radius) so the front image shows.
  // The side faces will get a default 0,0 -> covered by the base material color
  // which is exactly what we want for "broken glass edges".
  const positions = geometry.getAttribute('position');
  const uvs = new Float32Array(positions.count * 2);
  const minU = localShape.reduce((m, p) => Math.min(m, p.x), Infinity);
  const maxU = localShape.reduce((m, p) => Math.max(m, p.x), -Infinity);
  const minV = localShape.reduce((m, p) => Math.min(m, p.y), Infinity);
  const maxV = localShape.reduce((m, p) => Math.max(m, p.y), -Infinity);
  const spanU = Math.max(0.001, maxU - minU);
  const spanV = Math.max(0.001, maxV - minV);
  for (let i = 0; i < positions.count; i += 1) {
    const px = positions.getX(i);
    const py = positions.getY(i);
    const pz = positions.getZ(i);
    // Reproject onto the local plane.
    const rel = new THREE.Vector3(px, py, pz).sub(center);
    const uCoord = rel.dot(tangentU);
    const vCoord = rel.dot(tangentV);
    uvs[i * 2] = (uCoord - minU) / spanU;
    uvs[i * 2 + 1] = (vCoord - minV) / spanV;
  }
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  extrude.dispose();
  return { geometry, direction };
}

function carveShardGeometry(geometry, direction, totalCount, shardIndex) {
  const position = geometry.getAttribute('position');
  const centroid = direction.clone().multiplyScalar(BASE_RADIUS * 0.82);
  const gapFactor = getGapFactor(totalCount);
  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    normal.copy(vertex).normalize();

    // Lighter pull since the shard now has real depth — too much pull and
    // the side faces start to overlap their neighbors.
    const pull = gapFactor * 0.85 + seeded(shardIndex * 101 + index * 17) * 0.10;
    const radial = 0.95 + seeded(shardIndex * 61 + index * 13) * 0.05;

    const tangent = new THREE.Vector3(-direction.z, 0, direction.x);
    if (tangent.lengthSq() < 0.0001) tangent.set(1, 0, 0);
    else tangent.normalize();

    vertex.lerp(centroid, pull);
    vertex.addScaledVector(tangent, (seeded(shardIndex * 47 + index * 19) - 0.5) * 0.07);
    const spike = (seeded(shardIndex * 131 + index * 3) - 0.5) * 0.05;
    vertex.addScaledVector(normal, spike);
    vertex.multiplyScalar(radial);
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

function buildShardGeometries(totalCount) {
  const baseGeometry = new THREE.IcosahedronGeometry(BASE_RADIUS, getBaseDetail(totalCount));
  const attributes = {
    position: baseGeometry.getAttribute('position'),
    normal: baseGeometry.getAttribute('normal'),
    uv: baseGeometry.getAttribute('uv'),
  };
  const triangleCount = attributes.position.count / 3;
  const triangles = Array.from({ length: triangleCount }, (_, triangleIndex) => (
    createTriangleRecord(attributes, triangleIndex)
  ));
  const adjacency = buildAdjacency(triangles);
  const fracture = getFractureSeeds(totalCount);
  const brokenEdges = buildBrokenEdges(triangles, fracture);
  const assignments = growRegions(triangles, adjacency, totalCount, fracture);
  const buckets = Array.from({ length: totalCount }, () => []);

  triangles.forEach((triangle, triangleIndex) => {
    buckets[assignments[triangleIndex]].push(triangle);
  });

  baseGeometry.dispose();

  return buckets.map((bucket, shardIndex) => {
    const shardGeometry = buildGeometryFromTriangles(bucket, brokenEdges, shardIndex);
    carveShardGeometry(shardGeometry.geometry, shardGeometry.direction, totalCount, shardIndex);
    return shardGeometry;
  });
}

function createShard(index, totalCount, shardGeometry) {
  const material = createMaterial();
  const mesh = new THREE.Mesh(shardGeometry.geometry, material);

  const tangent = new THREE.Vector3(-shardGeometry.direction.z, 0, shardGeometry.direction.x);
  if (tangent.lengthSq() < 0.0001) tangent.set(1, 0, 0);
  else tangent.normalize();

  // Random per-shard depth offset and tilt — this is the "前后错层" effect.
  const normalOffset = (seeded(totalCount * 71 + index * 5) - 0.5) * 0.18;
  const sideOffset = (seeded(totalCount * 89 + index * 3) - 0.42) * 0.46;
  const tilt = (seeded(totalCount * 53 + index * 9) - 0.5) * 0.34;
  const tiltAxis = new THREE.Vector3(
    seeded(totalCount * 17 + index * 7) - 0.5,
    seeded(totalCount * 19 + index * 11) - 0.5,
    seeded(totalCount * 23 + index * 13) - 0.5,
  ).normalize();

  // Arrangement-driven position resolution.
  const arrangement = getArrangement(liveState.arrangement);
  const slot = arrangement.slotFor(index, totalCount, shardGeometry.direction);

  const explodedPosition = shardGeometry.direction
    .clone()
    .multiplyScalar(2.15 + (index % 3) * 0.12 + normalOffset)
    .addScaledVector(tangent, sideOffset);

  // Base "aggregated" position uses arrangement geometry.
  const basePosition = slot.position.clone();
  const baseRotation = slot.rotation.clone();
  const baseQuaternion = new THREE.Quaternion().setFromEuler(baseRotation);

  // Slight per-shard tilt around an arbitrary axis for the "broken" feel.
  const tiltQuat = new THREE.Quaternion().setFromAxisAngle(tiltAxis, tilt);
  baseQuaternion.multiply(tiltQuat);

  return {
    id: `shard-${index}`,
    index,
    mesh,
    material,
    uvRegion: { u0: 0, v0: 0, u1: 1, v1: 1 },
    direction: shardGeometry.direction.clone(),
    basePosition,
    baseQuaternion,
    aggregatedScale: 1,
    explodedPosition,
    depthOffset: 0,
    tilt,
    memoryCard: null,
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
  topologySeed = Math.random() * 1e6;

  const shardGeometries = buildShardGeometries(forceCount);
  shardRecords = shardGeometries.map((shardGeometry, index) => createShard(index, forceCount, shardGeometry));

  // Cache rest positions for shockwave displacement. Without this the wave
  // would compound and the shards would drift outward forever.
  shardRecords.forEach((record) => {
    const pos = record.mesh.geometry.getAttribute('position');
    record.restPositions = new Float32Array(pos.array);
  });

  shardRecords.forEach((record) => {
    record.mesh.position.copy(record.explodedPosition);
    record.mesh.quaternion.copy(new THREE.Quaternion());
    record.mesh.renderOrder = 2;
    record.mesh.userData.shardId = record.id;
    group.add(record.mesh);
  });

  window.SM.shards = shardRecords;
  window.SM.bus.emit('shards:rebuilt', { count: forceCount, shards: shardRecords });
  return shardRecords;
}

// Per-frame shockwave displacement. CPU-side, applied to each shard's
// BufferGeometry; reset to rest positions first so the wave decays cleanly.
let shockwaveFrame = 0;
function applyShockwave() {
  // The shockwave module is a sibling — pull it dynamically so we don't
  // create a circular import.
  const shockwave = window.SM?.modules?.anim?.shockwave;
  const active = shockwave?.getActive?.();
  if (!shockwaveFrame) shockwaveFrame = window.requestAnimationFrame(applyShockwave);

  if (!active) return; // no wave in flight — bail, but keep the loop alive

  const now = performance.now() * 0.001;
  const age = now - active.startedAt;
  const lifetime = shockwave.SHOCKWAVE_LIFETIME;
  if (age > lifetime) {
    // Wave is over. Snap back to rest positions.
    shardRecords.forEach((record) => {
      if (!record.restPositions) return;
      const pos = record.mesh.geometry.getAttribute('position');
      pos.array.set(record.restPositions);
      pos.needsUpdate = true;
      record.mesh.geometry.computeVertexNormals();
    });
    shockwave.consume();
    return;
  }

  const frontDistance = age * shockwave.SHOCKWAVE_SPEED;
  const fade = Math.max(0, 1 - age / lifetime);
  const amp = shockwave.SHOCKWAVE_AMPLITUDE * fade;
  const epicenter = active.epicenter;
  const tmp = new THREE.Vector3();
  const normal = new THREE.Vector3();

  shardRecords.forEach((record) => {
    if (!record.restPositions) return;
    const pos = record.mesh.geometry.getAttribute('position');
    const rest = record.restPositions;
    for (let i = 0; i < pos.count; i += 1) {
      const ox = rest[i * 3], oy = rest[i * 3 + 1], oz = rest[i * 3 + 2];
      tmp.set(ox, oy, oz).normalize();
      const distFromEpicenter = tmp.dot(epicenter); // [-1, 1]
      // Wave peak: gaussian centered on frontDistance, evaluated at the
      // vertex's "arc distance" from the epicenter.
      const arcDistance = Math.acos(THREE.MathUtils.clamp(distFromEpicenter, -1, 1));
      const offset = arcDistance - frontDistance;
      const gaussian = Math.exp(-(offset * offset) / (2 * shockwave.SHOCKWAVE_WIDTH * shockwave.SHOCKWAVE_WIDTH));
      // Only push outward, not inward.
      const displacement = gaussian * amp;
      normal.copy(tmp);
      pos.array[i * 3] = ox + normal.x * displacement;
      pos.array[i * 3 + 1] = oy + normal.y * displacement;
      pos.array[i * 3 + 2] = oz + normal.z * displacement;
    }
    pos.needsUpdate = true;
    record.mesh.geometry.computeVertexNormals();
  });
}

function randomizeTopology() {
  return rebuildShards(getDesiredShardCount());
}

function createFromTopology() {
  return shardRecords.length ? shardRecords : rebuildShards();
}

function animateShards(duration, positionResolver, options = {}) {
  ensureGroup();
  if (!shardRecords.length) createFromTopology();

  shardGroup.visible = true;
  window.SM.modules.render3d.sphereShell?.setVisible?.(true);

  const startedAt = performance.now();
  const startPositions = shardRecords.map((record) => record.mesh.position.clone());
  const startQuaternions = shardRecords.map((record) => record.mesh.quaternion.clone());
  const startOpacities = shardRecords.map((record) => record.material.opacity);

  return new Promise((resolve) => {
    function tick(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = options.easing ? options.easing(progress) : 1 - Math.pow(1 - progress, 3);

      shardRecords.forEach((record, index) => {
        const target = positionResolver(record);
        record.mesh.position.lerpVectors(startPositions[index], target, eased);
        if (options.useQuaternion) {
          const targetQuat = options.quaternionResolver
            ? options.quaternionResolver(record)
            : record.baseQuaternion;
          record.mesh.quaternion.slerpQuaternions(startQuaternions[index], targetQuat, eased);
        }
        if (options.opacityResolver) {
          record.material.opacity = THREE.MathUtils.lerp(
            startOpacities[index],
            options.opacityResolver(record, progress),
            eased,
          );
        }
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
  return animateShards(duration, (record) => record.explodedPosition.clone(), {
    useQuaternion: true,
    quaternionResolver: () => new THREE.Quaternion(),
    opacityResolver: (record) => Math.max(0.18, record.material.userData.baseOpacity * 0.32),
  });
}

function aggregate(duration = 1380) {
  // Opacity is driven externally (aggregate.js) so the imprint timing aligns
  // with the particle cloud. The motion itself is still eased cubic.
  return animateShards(duration, (record) => record.basePosition.clone(), {
    useQuaternion: true,
    quaternionResolver: (record) => record.baseQuaternion.clone(),
    easing: (progress) => 1 - Math.pow(1 - progress, 3),
  });
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

function setOpacityScale(scale = 1) {
  shardRecords.forEach((record) => {
    const nextOpacity = THREE.MathUtils.clamp((record.material.userData.baseOpacity ?? 0.96) * scale, 0.04, 1);
    const nextEmissive = (record.material.userData.baseEmissiveIntensity ?? 0.16) * (0.65 + scale * 0.35);
    record.material.opacity = nextOpacity;
    record.material.emissiveIntensity = nextEmissive;
    record.material.needsUpdate = true;
  });
}

function setArrangement(name) {
  if (liveState.arrangement === name) return;
  liveState.arrangement = name;
  // Re-resolve base positions so the next aggregation reflects the new arrangement.
  const arrangement = getArrangement(name);
  shardRecords.forEach((record, index) => {
    const slot = arrangement.slotFor(index, shardRecords.length, record.direction);
    record.basePosition.copy(slot.position);
    record.baseQuaternion.copy(new THREE.Quaternion().setFromEuler(slot.rotation));
  });
  window.SM.bus.emit('arrangement:change', { name });
}

function setMood(name) {
  if (liveState.mood === name) return;
  liveState.mood = name;
  const palette = moodPalette(name);
  shardRecords.forEach((record) => {
    if (record.material.sheen) {
      record.material.sheenColor = new THREE.Color(palette.sheen);
    }
    if (record.material.emissive) {
      record.material.emissive = new THREE.Color(palette.emissive);
    }
    record.material.userData.palette = palette;
    record.material.needsUpdate = true;
  });
  window.SM.bus.emit('mood:change', { name, palette });
}

function setTimelineMode(enabled) {
  liveState.timeline = !!enabled;
  const arrangement = getArrangement(enabled ? 'timeline' : liveState.arrangement);
  shardRecords.forEach((record, index) => {
    const slot = arrangement.slotFor(index, shardRecords.length, record.direction);
    record.basePosition.copy(slot.position);
  });
  window.SM.bus.emit('timeline:change', { enabled });
}

function getLiveState() {
  return { ...liveState };
}

function getPalette(mood = liveState.mood) {
  return moodPalette(mood);
}

function init() {
  rebuildShards();
  if (!shockwaveFrame) shockwaveFrame = window.requestAnimationFrame(applyShockwave);
  offMaterials = window.SM.bus.on('materials:updated', ({ assignments }) => {
    const nextCount = Math.max(MIN_SHARD_COUNT, assignments?.length || 0);
    if (nextCount !== shardRecords.length) {
      rebuildShards(nextCount);
    } else {
      window.SM.bus.emit('shards:rebuilt', { count: nextCount, shards: shardRecords });
    }
  });
  offArrangement = window.SM.bus.on('arrangement:set', ({ name }) => setArrangement(name));
  offMood = window.SM.bus.on('mood:set', ({ name }) => setMood(name));
}

function destroy() {
  offMaterials?.();
  offArrangement?.();
  offMood?.();
  offMaterials = null;
  offArrangement = null;
  offMood = null;
  if (shockwaveFrame) {
    window.cancelAnimationFrame(shockwaveFrame);
    shockwaveFrame = 0;
  }
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
  randomizeTopology,
  explode,
  aggregate,
  rotateBy,
  rotateTo,
  getShards,
  getShardById,
  setVisible,
  setOpacityScale,
  setArrangement,
  setMood,
  setTimelineMode,
  getLiveState,
  getPalette,
};
