// GPGPU particle cloud — 16,000 particles whose positions are computed
// entirely on the GPU. The position/velocity textures are stepped every
// frame using GPUComputationRenderer; the rendered Points cloud samples
// the position texture directly in the vertex shader (no CPU readback).
//
// The flow-field is fed by 3D value-noise in the position fragment, with
// a soft sphere attractor that keeps particles in a 6-unit shell.

import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';

const PARTICLE_COUNT = 16000;
const FIELD_RADIUS = 6.0;

let gpu = null;
let positionVar = null;
let velocityVar = null;
let points = null;
let geometry = null;
let material = null;
let frameId = 0;
let mood = 'wistful';
let offMood = null;
let renderer = null;
let texSize = 0;

const MOOD_TINT = {
  vivid: new THREE.Color('#ffb27a'),
  wistful: new THREE.Color('#9ed5ff'),
  healing: new THREE.Color('#7be2c8'),
};

const POSITION_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uDelta;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 pos = texture2D(texturePosition, uv);
    vec4 vel = texture2D(textureVelocity, uv);

    // Noise drift.
    vec3 drift = vec3(
      noise(pos.xyz * 0.4 + vec3(uTime * 0.18, 0.0, 0.0)) - 0.5,
      noise(pos.xyz * 0.4 + vec3(0.0, uTime * 0.18, 0.0)) - 0.5,
      noise(pos.xyz * 0.4 + vec3(0.0, 0.0, uTime * 0.18)) - 0.5
    );
    vel.xyz += drift * 0.0015;
    vel.xyz *= 0.985;

    // Soft bounds.
    float r = length(pos.xyz);
    if (r > 6.0) vel.xyz -= normalize(pos.xyz) * 0.01;
    if (r < 0.4) vel.xyz += normalize(pos.xyz + 0.001) * 0.02;

    pos.xyz += vel.xyz * uDelta;
    gl_FragColor = pos;
  }
`;

const VELOCITY_FRAG = /* glsl */ `
  void main() {
    gl_FragColor = texture2D(textureVelocity, gl_FragCoord.xy / resolution.xy);
  }
`;

// The Points material samples the GPGPU position texture directly.
const POINTS_VERT = /* glsl */ `
  uniform sampler2D uPositions;
  uniform float uTexSize;
  attribute float aIndex;

  varying float vAlpha;

  void main() {
    float ix = mod(aIndex, uTexSize);
    float iy = floor(aIndex / uTexSize);
    vec2 uv = (vec2(ix, iy) + 0.5) / uTexSize;
    vec4 sampled = texture2D(uPositions, uv);
    vec3 p = sampled.xyz;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = 2.0 * (1.0 / -mv.z);

    // Particle is dimmer near the sphere center (where the shards are).
    vAlpha = smoothstep(0.0, 1.5, length(p));
  }
`;

const POINTS_FRAG = /* glsl */ `
  uniform vec3 uTint;
  uniform float uOpacity;
  varying float vAlpha;

  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.0, r) * uOpacity * vAlpha;
    gl_FragColor = vec4(uTint, a);
  }
`;

function seedTextures(texType = THREE.FloatType) {
  const posArray = new Float32Array(texSize * texSize * 4);
  const velArray = new Float32Array(texSize * texSize * 4);
  for (let i = 0; i < texSize * texSize; i += 1) {
    if (i >= PARTICLE_COUNT) {
      posArray[i * 4] = 0;
      posArray[i * 4 + 1] = 0;
      posArray[i * 4 + 2] = 0;
      posArray[i * 4 + 3] = 1;
      velArray[i * 4] = 0;
      velArray[i * 4 + 1] = 0;
      velArray[i * 4 + 2] = 0;
      velArray[i * 4 + 3] = 0;
      continue;
    }
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = 2 * Math.PI * Math.random();
    const r = 2.4 + Math.random() * 3.4;
    posArray[i * 4] = r * Math.sin(phi) * Math.cos(theta);
    posArray[i * 4 + 1] = r * Math.cos(phi);
    posArray[i * 4 + 2] = r * Math.sin(phi) * Math.sin(theta);
    posArray[i * 4 + 3] = 1;
    velArray[i * 4] = 0;
    velArray[i * 4 + 1] = 0;
    velArray[i * 4 + 2] = 0;
    velArray[i * 4 + 3] = 0;
  }
  // If we have to use UnsignedByteType, quantize the data to [0, 1].
  if (texType === THREE.UnsignedByteType) {
    for (let i = 0; i < texSize * texSize * 4; i += 1) {
      posArray[i] = (posArray[i] + 7) / 14; // remap [-7, 7] to [0, 1]
    }
  }
  const posTex = new THREE.DataTexture(posArray, texSize, texSize, THREE.RGBAFormat, texType);
  posTex.needsUpdate = true;
  const velTex = new THREE.DataTexture(velArray, texSize, texSize, THREE.RGBAFormat, texType);
  velTex.needsUpdate = true;
  return { posTex, velTex };
}

function ensurePoints() {
  if (points) return points;
  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (!root) return null;

  // BufferGeometry that knows which particle is at which texel.
  geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const indices = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    indices[i] = i;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aIndex', new THREE.BufferAttribute(indices, 1));
  geometry.setDrawRange(0, PARTICLE_COUNT);

  material = new THREE.ShaderMaterial({
    uniforms: {
      uPositions: { value: null },
      uTexSize: { value: texSize },
      uTint: { value: MOOD_TINT[mood].clone() },
      uOpacity: { value: 0.85 },
    },
    vertexShader: POINTS_VERT,
    fragmentShader: POINTS_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 0;
  root.add(points);
  return points;
}

function update() {
  frameId = window.requestAnimationFrame(update);
  if (!gpu || !positionVar || !points) return;
  positionVar.material.uniforms.uTime.value = performance.now() * 0.001;
  gpu.compute();
  // Bind the freshly-computed texture so the next render samples it.
  material.uniforms.uPositions.value = gpu.getCurrentRenderTarget(positionVar).texture;
}

function setMood(name) {
  if (!name) return;
  mood = name;
  if (material) {
    material.uniforms.uTint.value.copy(MOOD_TINT[name] ?? MOOD_TINT.wistful);
  }
}

function init() {
  renderer = window.SM?.modules?.render3d?.scene?.getRenderer?.();
  if (!renderer) return;
  const gl = renderer.getContext();
  const hasFloat = !!gl.getExtension('OES_texture_float') || gl instanceof WebGL2RenderingContext;
  const texType = hasFloat ? THREE.FloatType : THREE.UnsignedByteType;
  texSize = Math.pow(2, Math.ceil(Math.log2(Math.sqrt(PARTICLE_COUNT))));
  ensurePoints();
  const { posTex, velTex } = seedTextures(texType);
  gpu = new GPUComputationRenderer(texSize, texSize, renderer);
  // CRITICAL: add BOTH variables before setting any dependencies. The
  // dependency resolver only knows about variables that have been added.
  positionVar = gpu.addVariable('texturePosition', POSITION_FRAG, posTex);
  velocityVar = gpu.addVariable('textureVelocity', VELOCITY_FRAG, velTex);
  gpu.setVariableDependencies(positionVar, [positionVar, velocityVar]);
  gpu.setVariableDependencies(velocityVar, [velocityVar]);
  positionVar.material.uniforms.uTime = { value: 0 };
  positionVar.material.uniforms.uDelta = { value: 1 / 60 };
  const err = gpu.init();
  if (err) {
    console.warn('[gpgpu] init error, disabling cloud:', err);
    gpu = null;
    return;
  }
  material.uniforms.uPositions.value = gpu.getCurrentRenderTarget(positionVar).texture;
  if (!frameId) frameId = window.requestAnimationFrame(update);
  offMood = window.SM.bus.on('mood:change', ({ name }) => setMood(name));
}

function destroy() {
  offMood?.();
  offMood = null;
  if (frameId) {
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  }
  geometry?.dispose?.();
  material?.dispose?.();
  points?.parent?.remove?.(points);
  geometry = null;
  material = null;
  points = null;
  gpu = null;
  positionVar = null;
  velocityVar = null;
}

export {
  init,
  destroy,
  setMood,
};
