// Ribbon trail — when a shard is focused, a glowing ribbon follows the
// rotation of the sphere, traced from the shard's current world position
// around the sphere (a spiral that decays). The ribbon uses three's
// LineMaterial (fat lines) so it's actually visible on retina displays.
// The control points are smoothed with a CatmullRom curve so the trail
// bends elegantly instead of zig-zagging through the raw sample positions.

import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

const MAX_POINTS = 60;
const RESAMPLE_POINTS = 40;
const FADE_DURATION = 2200; // ms

let lineObj = null;
let lineGeom = null;
let lineMat = null;
let trailPoints = [];
let trailStartedAt = 0;
let activeShardId = null;
let lastPosition = new THREE.Vector3();
let frameId = 0;
let offFocus = null;
let offBlur = null;

const tmpCurve = new THREE.CatmullRomCurve3(
  [new THREE.Vector3(), new THREE.Vector3()],
  false,
  'catmullrom',
  0.4,
);

function ensureLine() {
  if (lineObj) return lineObj;
  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (!root) return null;
  lineGeom = new LineGeometry();
  const initPositions = new Array(RESAMPLE_POINTS * 3).fill(0);
  const initColors = new Array(RESAMPLE_POINTS * 3).fill(0);
  lineGeom.setPositions(initPositions);
  lineGeom.setColors(initColors);
  lineMat = new LineMaterial({
    color: '#9ed5ff',
    linewidth: 4,
    transparent: true,
    opacity: 0.0,
    worldUnits: false,
    depthWrite: false,
  });
  lineMat.resolution.set(window.innerWidth, window.innerHeight);
  lineObj = new Line2(lineGeom, lineMat);
  lineObj.computeLineDistances();
  lineObj.scale.setScalar(1);
  lineObj.frustumCulled = false;
  root.add(lineObj);
  return lineObj;
}

function start(shardId) {
  activeShardId = shardId;
  trailPoints = [];
  trailStartedAt = performance.now();
  lastPosition = new THREE.Vector3();
  if (lineMat) lineMat.opacity = 0.95;
  if (lineObj) lineObj.visible = true;
}

function stop() {
  activeShardId = null;
}

function refreshResolution() {
  if (lineMat) lineMat.resolution.set(window.innerWidth, window.innerHeight);
}

function update() {
  frameId = window.requestAnimationFrame(update);
  if (!lineObj || !lineMat) return;
  if (!activeShardId && trailPoints.length === 0) {
    lineMat.opacity = 0;
    lineObj.visible = false;
    return;
  }

  if (activeShardId) {
    const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];
    const shard = shards.find((s) => s.id === activeShardId);
    if (shard) {
      const worldPos = new THREE.Vector3();
      shard.mesh.getWorldPosition(worldPos);
      const moved = worldPos.distanceTo(lastPosition) > 0.0006;
      if (moved || trailPoints.length === 0) {
        trailPoints.push(worldPos.clone());
        lastPosition.copy(worldPos);
        if (trailPoints.length > MAX_POINTS) {
          trailPoints.splice(0, trailPoints.length - MAX_POINTS);
        }
      }
    }
  }

  if (trailPoints.length < 2) {
    lineMat.opacity = 0;
    return;
  }

  const age = performance.now() - trailStartedAt;
  const fade = Math.max(0, 1 - age / FADE_DURATION);
  lineMat.opacity = 0.85 * fade;
  if (fade <= 0.001) {
    trailPoints = [];
    lineObj.visible = false;
    return;
  }

  // Build / refresh the CatmullRom curve. We need at least 2 control
  // points; the curve will produce RESAMPLE_POINTS samples even when the
  // input has only 2 points.
  while (tmpCurve.points.length < trailPoints.length) {
    tmpCurve.points.push(new THREE.Vector3());
  }
  while (tmpCurve.points.length > trailPoints.length) {
    tmpCurve.points.pop();
  }
  trailPoints.forEach((p, idx) => tmpCurve.points[idx].copy(p));

  // Resample along the curve so the rendered line is a smooth spline.
  const samples = tmpCurve.getPoints(RESAMPLE_POINTS - 1);

  const positions = new Array(RESAMPLE_POINTS * 3);
  const colors = new Array(RESAMPLE_POINTS * 3);
  const color = new THREE.Color();
  for (let i = 0; i < RESAMPLE_POINTS; i += 1) {
    const t = i / (RESAMPLE_POINTS - 1);
    const src = samples[i];
    positions[i * 3] = src.x;
    positions[i * 3 + 1] = src.y;
    positions[i * 3 + 2] = src.z;
    // Color: cyan inner -> fade to transparent.
    const a = (1 - t) * 0.95 * fade;
    color.setRGB(0.62 * a, 0.84 * a, 1.0 * a);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  lineGeom.setPositions(positions);
  lineGeom.setColors(colors);
  lineObj.computeLineDistances();
}

function init() {
  ensureLine();
  if (!frameId) frameId = window.requestAnimationFrame(update);
  offFocus = window.SM.bus.on('shard:focus', ({ shardId }) => {
    if (shardId) start(shardId);
  });
  offBlur = window.SM.bus.on('shard:blur', () => stop());
  window.addEventListener('resize', refreshResolution);
}

function destroy() {
  offFocus?.();
  offBlur?.();
  offFocus = null;
  offBlur = null;
  window.removeEventListener('resize', refreshResolution);
  if (frameId) {
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  }
  lineObj?.parent?.remove?.(lineObj);
  lineGeom?.dispose?.();
  lineMat?.dispose?.();
  lineObj = null;
  lineGeom = null;
  lineMat = null;
  trailPoints = [];
  activeShardId = null;
}

export {
  init,
  destroy,
  start,
  stop,
};
