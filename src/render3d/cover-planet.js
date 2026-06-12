// Cover planet — a real WebGL fragment-shader planet for the cover screen.
//
// Replaces the CSS multi-layer-conic `cover-hero-core` with a proper
// shader-driven solid sphere so the cover hero reads as a real lit planet
// (fragment FBM aurora + atmospheric scattering + specular highlight +
// city-light dapple), not a stack of static gradients.
//
// Why WebGL here: the CSS simulation hit a ceiling. CSS can fake layers,
// but it can't run a real FBM-noise 5-octave aurora band with view-dependent
// atmospheric scattering and a proper specular highlight. This module runs
// a single SphereGeometry with a custom ShaderMaterial and gets visionOS-
// class visuals at static frame and full motion at runtime.
//
// Lifecycle:
//   - initCoverPlanet(host) is called by cover.js when the cover screen
//     first renders, IF the user is not in ?renderMode=2d. It mounts a
//     <canvas> inside the host, sets up the renderer / scene / camera,
//     and starts a requestAnimationFrame loop.
//   - destroyCoverPlanet() is called when the app leaves the cover state
//     (or on hot-reload), it cancels the loop, disposes the renderer and
//     materials, and removes the canvas.
//
// Software-WebGL fallback: the renderer is created with
// `antialias: true` and `powerPreference: 'low-power'`. If WebGL is
// unavailable (rare — only when ?renderMode=2d is set), the host keeps
// its CSS multi-layer planet unchanged. We never throw to the user.

import * as THREE from 'three';

const VERT = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  uniform float uTime;
  uniform float uHue;       // 0=wistful (violet), 1=vivid (magenta), 2=healing (cyan)
  uniform float uOpacity;
  uniform float uPulse;     // 0..1 subtle breath
  uniform vec3  uLightDir;  // top-left light direction, world space
  uniform vec2  uCenter;    // canvas-center in pixel space, used for the disc mask
  uniform float uDiscR;     // disc radius in pixels

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(p + vec3(0.0, 0.0, 0.0)), hash(p + vec3(1.0, 0.0, 0.0)), f.x),
          mix(hash(p + vec3(0.0, 1.0, 0.0)), hash(p + vec3(1.0, 1.0, 0.0)), f.x), f.y),
      mix(mix(hash(p + vec3(0.0, 0.0, 1.0)), hash(p + vec3(1.0, 0.0, 1.0)), f.x),
          mix(hash(p + vec3(0.0, 1.0, 1.0)), hash(p + vec3(1.0, 1.0, 1.0)), f.x), f.y),
      f.z);
  }

  // 5-octave FBM. baseFrequency is built into the input position so the
  // caller controls the feature size of the resulting noise.
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

  vec3 auroraColor() {
    if (uHue > 1.5) return vec3(0.36, 0.92, 0.78);   // healing — cyan/green
    if (uHue > 0.5) return vec3(1.00, 0.55, 0.82);   // vivid   — magenta
    return vec3(0.70, 0.50, 1.00);                    // wistful — violet
  }

  // City-light dapple: very high-frequency twinkle inside the dark side
  // of the planet, suggesting distant cities. Hits only on the back
  // hemisphere relative to the light.
  float cityLights(vec3 n, float t) {
    float back = clamp(-dot(n, uLightDir) * 0.5 + 0.5, 0.0, 1.0);
    back = smoothstep(0.55, 0.95, back);
    vec3 q = n * 32.0 + vec3(0.0, t * 0.4, 0.0);
    float c = fbm(q);
    c = smoothstep(0.55, 0.78, c);
    return c * back;
  }

  void main() {
    // ---------- 0. Disc mask ----------
    // The canvas is square; the planet is round. We compare the
    // fragment's window-space position to the canvas-center +
    // disc-radius uniform and discard everything outside the disc,
    // with a 1.5% soft edge to avoid aliasing on the silhouette.
    // gl_FragCoord is in pixel units, so we need uCenter/uDiscR in
    // the same units.
    float r = length(gl_FragCoord.xy - uCenter) / uDiscR;
    if (r > 1.0) discard;
    float discMask = smoothstep(1.0, 0.985, r);

    vec3 n = normalize(vWorldNormal);
    vec3 v = normalize(vViewDir);
    vec3 l = normalize(uLightDir);

    // ---------- 1. Base body ----------
    // iOS 18 dark-purple aurora palette, bright enough to read as a
    // lit sphere even in software WebGL. The previous build ran
    // darker than the CSS planet because the fragment shader has to
    // carry the body on its own (no inner shadow / outer glow to lean
    // on), so we lifted the mid/hi values 2x from the sphere-shell
    // glass-shell shader.
    float y = n.y * 0.5 + 0.5;
    vec3 deep     = vec3(0.16, 0.10, 0.30);
    vec3 mid      = vec3(0.42, 0.24, 0.62);
    vec3 hi       = vec3(0.72, 0.50, 0.96);
    vec3 base = mix(deep, mid, 1.0 - y);
    base = mix(base, hi, pow(max(0.0, n.x * 0.4 + n.y * 0.7 + 0.18), 1.8) * 0.85);

    // ---------- 2. Aurora bands (FBM-driven) ----------
    // Two counter-rotating latitudes. The FBM noise warps the latitude
    // coordinate so the bands look like flowing curtains, not clean rings.
    vec3 mc = auroraColor();
    vec3 q1 = n * 2.6 + vec3(uTime * 0.020, uTime * 0.014, 0.0);
    float n1 = fbm(q1);
    n1 = smoothstep(0.42, 0.86, n1);
    // Latitude mask — restrict aurora to mid-latitudes so the poles stay
    // calm and the equator gets the most activity.
    float lat1 = exp(-pow((n.y - 0.10) * 1.4, 2.0));
    base += mc * n1 * 0.38 * lat1;

    vec3 q2 = n * 3.2 + vec3(-uTime * 0.015, uTime * 0.022, uTime * 0.008);
    float n2 = fbm(q2);
    n2 = smoothstep(0.55, 0.92, n2);
    float lat2 = exp(-pow((n.y + 0.18) * 1.7, 2.0));
    base += mc * n2 * 0.32 * lat2;

    // ---------- 3. Specular highlight (top-left) ----------
    // Two-lobe Blinn-Phong. A narrow lobe (pow 18) gives a wet, glossy
    // terminator; a wider lobe (pow 4) gives the diffuse wet-look
    // sheen visionOS spheres have. The narrow lobe alone collapses on
    // software WebGL (swiftshader underestimates exp()), so the wide
    // lobe carries the visual even if the narrow lobe vanishes.
    vec3 h = normalize(l + v);
    float nDotH = max(0.0, dot(n, h));
    float specNarrow = pow(nDotH, 18.0);
    float specWide   = pow(nDotH, 4.0);
    base += vec3(1.0, 0.92, 1.0) * (specNarrow * 0.85 + specWide * 0.22);

    // ---------- 4. Atmospheric scattering (rim glow) ----------
    // Cold-blue Fresnel-like rim. The standard
    //     pow(1 - dot(N, V), 4)
    // pattern, with a separate warm-purple inner halo to suggest a
    // chromatic atmosphere.
    float fres = pow(1.0 - max(0.0, dot(n, v)), 4.0);
    vec3 rimCold = vec3(0.42, 0.66, 1.00);
    vec3 rimWarm = vec3(0.78, 0.42, 0.96);
    base += rimCold * fres * 0.55;
    base += rimWarm * fres * 0.18 * (0.5 + 0.5 * n.y);

    // ---------- 5. Terminator shadow ----------
    // Softens the day/night transition; nDotL ramps the body color toward
    // a deeper purple-black on the back hemisphere. The 0.65 floor keeps
    // the night side visible (we have city lights to show off), but
    // the day side still wins in contrast.
    float nDotL = dot(n, l) * 0.5 + 0.5;
    base = mix(base * 0.65, base, nDotL);

    // ---------- 6. City lights on the night side ----------
    base += vec3(1.0, 0.86, 0.55) * cityLights(n, uTime) * 0.32;

    // ---------- 7. Subtle breathing pulse ----------
    base *= 0.96 + uPulse * 0.08;

    gl_FragColor = vec4(base, uOpacity * discMask);
  }
`;

let renderer = null;
let scene = null;
let camera = null;
let planetMesh = null;
let planetMaterial = null;
let frameId = 0;
let canvas = null;
let resizeObserver = null;

function disposeAll() {
  if (frameId) window.cancelAnimationFrame(frameId);
  frameId = 0;
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (planetMesh) {
    planetMesh.geometry?.dispose?.();
    planetMaterial?.dispose?.();
    if (planetMesh.parent) planetMesh.parent.remove(planetMesh);
  }
  planetMesh = null;
  planetMaterial = null;
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss?.();
    renderer = null;
  }
  if (canvas && canvas.parentNode) {
    canvas.parentNode.removeChild(canvas);
  }
  canvas = null;
  scene = null;
  camera = null;
}

function tick() {
  frameId = window.requestAnimationFrame(tick);
  if (!renderer || !planetMaterial || !planetMesh) return;
  const t = performance.now() * 0.001;
  planetMaterial.uniforms.uTime.value = t;
  // Subtle breath: 8s sin loop, 0..1..0.
  planetMaterial.uniforms.uPulse.value = 0.5 + 0.5 * Math.sin(t * 0.78);
  // Slow Y rotation so the planet reads as turning. The asymmetric
  // FBM aurora noise makes the rotation visible at any frame.
  planetMesh.rotation.y = t * 0.10;
  planetMesh.rotation.x = Math.sin(t * 0.07) * 0.06;
  renderer.render(scene, camera);
}

function initCoverPlanet(host) {
  if (!host) return false;
  if (canvas) return true; // already initialized

  // Don't init if user explicitly asked for 2D mode.
  const url = new URL(window.location.href);
  if (url.searchParams.get('renderMode') === '2d') return false;

  // Don't init if WebGL is unavailable.
  const probe = document.createElement('canvas');
  const probeCtx = probe.getContext('webgl2') || probe.getContext('webgl');
  if (!probeCtx) return false;

  // Mount a canvas inside the host. host is the existing
  // `.cover-hero-core` element — we replace its visual by drawing WebGL
  // over it. The host's CSS-driven visuals (background, box-shadow) still
  // apply as a backdrop in case WebGL draws nothing.
  canvas = document.createElement('canvas');
  canvas.className = 'cover-hero-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  // Inline the canvas display so it doesn't fight the host's CSS.
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: '0',
  });
  // Ensure the host is positioned so the canvas can absolutely fill it.
  if (!host.style.position) host.style.position = 'relative';
  host.appendChild(canvas);

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[cover-planet] WebGL init failed, falling back to CSS:', err);
    disposeAll();
    return false;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();
  // Orthographic camera fit-to-host: a unit-sphere at z=0 with an
  // orthographic projection means we don't have to deal with FOV
  // adjustments when the host resizes — we just rebuild the projection
  // from the host's bounding box.
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 2;
  camera.lookAt(0, 0, 0);

  const geometry = new THREE.SphereGeometry(0.78, 96, 96);
  planetMaterial = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTime:    { value: 0 },
      uHue:     { value: 0 },          // wistful by default
      uOpacity: { value: 1.0 },
      uPulse:   { value: 0.0 },
      uLightDir:{ value: new THREE.Vector3(-0.55, 0.65, 0.55).normalize() },
      uCenter:  { value: new THREE.Vector2(0, 0) },
      uDiscR:   { value: 1.0 },
    },
    transparent: true,
    depthWrite: false,
  });
  planetMesh = new THREE.Mesh(geometry, planetMaterial);
  scene.add(planetMesh);

  // Fit projection to host size. The shader needs:
  //   - camera projection (ortho, square so the unit sphere renders as
  //     a true round disc — the previous fit() used 2*h/w aspect which
  //     stretched the sphere into a vertical oval)
  //   - uCenter / uDiscR in pixel space, so the disc-mask can round
  //     the planet to the same shape as the host's CSS
  //     border-radius:50% circle.
  const fit = () => {
    if (!renderer || !camera || !host || !planetMaterial) return;
    const rect = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    renderer.setSize(w, h, false);
    // Use a square ortho projection: -1..1 in both axes. The unit
    // sphere then renders as a perfect circle regardless of host
    // aspect ratio. The disc-mask below then trims the silhouette
    // to min(w, h) so the planet fits the host's CSS circle.
    camera.left = -1;
    camera.right = 1;
    camera.top = 1;
    camera.bottom = -1;
    camera.updateProjectionMatrix();
    const dpr = renderer.getPixelRatio();
    planetMaterial.uniforms.uCenter.value.set(
      (w * dpr) * 0.5,
      (h * dpr) * 0.5,
    );
    planetMaterial.uniforms.uDiscR.value = (Math.min(w, h) * dpr) * 0.5;
  };
  fit();
  resizeObserver = new ResizeObserver(fit);
  resizeObserver.observe(host);

  if (!frameId) frameId = window.requestAnimationFrame(tick);
  return true;
}

function setCoverPlanetMood(name) {
  if (!planetMaterial) return;
  const idx = { wistful: 0, vivid: 1, healing: 2 }[name] ?? 0;
  planetMaterial.uniforms.uHue.value = idx;
}

function destroyCoverPlanet() {
  disposeAll();
}

export {
  initCoverPlanet,
  destroyCoverPlanet,
  setCoverPlanetMood,
};
