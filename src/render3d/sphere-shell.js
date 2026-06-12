// Sphere shell — a faint inner glass shell that holds the shards in place
// visually and provides depth. The shell is rendered with `BackSide` so
// only its inner surface is visible from the camera.
//
// The inner shell is now a custom ShaderMaterial: an FBM-noise based
// "memory starscape" gradient + a procedural star field. The user sees
// a soft universe gradient when looking through gaps between shards.

import * as THREE from 'three';

let shellGroup = null;
let shellMeshes = [];
let starMaterial = null;
let haloMaterial = null;
let orbitMaterial = null;
let orbitMaterialB = null;
let frameId = 0;
let offMood = null;
let mood = 'wistful';

const STAR_VERT = /* glsl */ `
  varying vec3 vWorldNormal;
  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const STAR_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vWorldNormal;
  uniform float uTime;
  uniform float uMood;     // 0=wistful, 1=vivid, 2=healing
  uniform float uOpacity;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(p + vec3(0,0,0)), hash(p + vec3(1,0,0)), f.x),
                   mix(hash(p + vec3(0,1,0)), hash(p + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(p + vec3(0,0,1)), hash(p + vec3(1,0,1)), f.x),
                   mix(hash(p + vec3(0,1,1)), hash(p + vec3(1,1,1)), f.x), f.y), f.z);
  }

  float fbm(vec3 p) {
    float a = 0.5;
    float r = 0.0;
    for (int i = 0; i < 5; i += 1) {
      r += a * noise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return r;
  }

  vec3 moodColor() {
    if (uMood > 1.5) return vec3(0.42, 0.86, 0.78);
    if (uMood > 0.5) return vec3(1.0, 0.62, 0.42);
    return vec3(0.56, 0.84, 1.0);
  }

  float starLayer(vec3 dir, float cellSize, float threshold, float twinkleSpeed) {
    vec3 cell = floor(dir / cellSize);
    float h = hash(cell);
    if (h < threshold) return 0.0;
    vec3 inner = fract(dir / cellSize) - 0.5;
    vec3 center = vec3(hash(cell + 1.0), hash(cell + 2.0), hash(cell + 3.0)) - 0.5;
    float d = length(inner - center * 0.7);
    float star = smoothstep(0.04, 0.0, d);
    float phase = h * 6.28;
    float twinkle = 0.55 + 0.45 * sin(uTime * twinkleSpeed + phase);
    return star * twinkle;
  }

  void main() {
    vec3 dir = normalize(vWorldNormal);

    float y = dir.y * 0.5 + 0.5;
    vec3 base = mix(vec3(0.04, 0.05, 0.10), vec3(0.08, 0.10, 0.16), 1.0 - y);
    base = mix(base, vec3(0.02, 0.02, 0.05), pow(1.0 - y, 3.0));

    vec3 mc = moodColor();
    float n = fbm(dir * 2.4 + vec3(0.0, uTime * 0.012, 0.0));
    n = smoothstep(0.45, 0.85, n);
    base += mc * n * 0.18;

    float stars = 0.0;
    stars += starLayer(dir,           120.0, 0.94, 2.4) * 0.8;
    stars += starLayer(dir + 0.07,     60.0, 0.96, 1.8) * 0.5;
    stars += starLayer(dir + 0.13,     35.0, 0.98, 1.2) * 0.35;
    base += vec3(1.0) * stars;

    gl_FragColor = vec4(base, uOpacity);
  }
`;

const HALO_VERT = STAR_VERT;
const HALO_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vWorldNormal;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    float y = vWorldNormal.y;
    float band = exp(-y * y * 2.6);
    gl_FragColor = vec4(uColor * band, uOpacity * band);
  }
`;

const MOOD_HALO = {
  vivid: new THREE.Color('#ff9d6e'),
  wistful: new THREE.Color('#8fd6ff'),
  healing: new THREE.Color('#7be2c8'),
};

const MOOD_INDEX = { wistful: 0, vivid: 1, healing: 2 };

function disposeShell() {
  if (frameId) window.cancelAnimationFrame(frameId);
  frameId = 0;
  shellMeshes.forEach((mesh) => {
    mesh.geometry?.dispose?.();
    mesh.material?.dispose?.();
    mesh.parent?.remove?.(mesh);
  });
  shellMeshes = [];
  starMaterial = null;
  haloMaterial = null;
  orbitMaterial = null;
  orbitMaterialB = null;
  shellGroup?.parent?.remove?.(shellGroup);
  shellGroup = null;
}

function ensureShell() {
  if (shellGroup) return shellGroup;

  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (!root) return null;

  shellGroup = new THREE.Group();
  shellGroup.name = 'sphere-shell';

  const innerGeom = new THREE.SphereGeometry(1.57, 96, 96);
  starMaterial = new THREE.ShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uMood: { value: MOOD_INDEX[mood] },
      uOpacity: { value: 0.95 },
    },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
  const glassShell = new THREE.Mesh(innerGeom, starMaterial);
  glassShell.renderOrder = -1;

  const haloGeom = new THREE.SphereGeometry(1.74, 36, 36);
  haloMaterial = new THREE.ShaderMaterial({
    vertexShader: HALO_VERT,
    fragmentShader: HALO_FRAG,
    uniforms: {
      uColor: { value: MOOD_HALO[mood].clone() },
      uOpacity: { value: 0.18 },
    },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
  const haloShell = new THREE.Mesh(haloGeom, haloMaterial);

  orbitMaterial = new THREE.MeshBasicMaterial({
    color: '#ffd3ea',
    transparent: true,
    opacity: 0.26,
  });
  const orbitRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.98, 0.018, 18, 180),
    orbitMaterial,
  );
  orbitRing.rotation.set(Math.PI / 2.35, 0.2, -0.18);

  orbitMaterialB = orbitMaterial.clone();
  orbitMaterialB.color.set('#8fd6ff');
  orbitMaterialB.opacity = 0.18;
  const orbitRingB = new THREE.Mesh(
    new THREE.TorusGeometry(1.98, 0.018, 18, 180),
    orbitMaterialB,
  );
  orbitRingB.rotation.set(Math.PI / 3.1, -0.45, 0.36);
  orbitRingB.scale.setScalar(0.94);

  shellGroup.add(glassShell, haloShell, orbitRing, orbitRingB);
  root.add(shellGroup);
  shellMeshes = [glassShell, haloShell, orbitRing, orbitRingB];
  return shellGroup;
}

function tick() {
  frameId = window.requestAnimationFrame(tick);
  if (starMaterial) starMaterial.uniforms.uTime.value = performance.now() * 0.001;
}

function setMood(name) {
  if (!name) return;
  mood = name;
  if (starMaterial) starMaterial.uniforms.uMood.value = MOOD_INDEX[name] ?? 0;
  if (haloMaterial) haloMaterial.uniforms.uColor.value.copy(MOOD_HALO[name] ?? MOOD_HALO.wistful);
}

function init() {
  ensureShell();
  if (!frameId) frameId = window.requestAnimationFrame(tick);
  offMood = window.SM.bus.on('mood:change', ({ name }) => setMood(name));
}

function destroy() {
  offMood?.();
  offMood = null;
  disposeShell();
}

function setVisible(visible) {
  if (shellGroup) shellGroup.visible = !!visible;
}

function setScale(scale) {
  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (root) root.scale.setScalar(scale);
}

export {
  init,
  destroy,
  setVisible,
  setScale,
};
