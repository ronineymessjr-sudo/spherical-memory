// Post-processing chain for spherical-memory.
// RenderPass -> UnrealBloomPass -> FilmDevelopPass -> OutputPass
//
// Bloom makes emissive (seam glow, particle hot core, focused shard aura)
// actually feel like light, not just bright pixels. FilmDevelop adds grain
// + soft vignette + a develop-glow tied to the imprint phase.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const DEVELOP_FRAG = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform float uDevelop;
  uniform float uGrain;
  uniform float uVignette;
  uniform float uScanline;
  uniform float uChromatic;
  uniform float uQuality;
  uniform vec3  uTint;
  varying vec2 vUv;

  // Hash + noise from https://www.shadertoy.com/view/4djSRW
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

  // Sample a color channel with a tiny UV offset for chromatic aberration.
  // Only fires when uChromatic is non-trivial; otherwise the develop pass
  // collapses to a single sample, keeping software WebGL happy.
  vec3 sampleRGB(vec2 uv, float amount) {
    if (amount < 0.0005) return texture2D(tDiffuse, uv).rgb;
    vec2 dir = uv - 0.5;
    float r = texture2D(tDiffuse, uv - dir * amount).r;
    float g = texture2D(tDiffuse, uv).g;
    float b = texture2D(tDiffuse, uv + dir * amount).b;
    return vec3(r, g, b);
  }

  void main() {
    vec2 centered = vUv - 0.5;
    float r = length(centered);

    // uQuality: 0 = low (no chromatic, no scanlines), 1 = high (everything).
    // Low keeps software WebGL around 15-20 fps.
    float chromaticAmount = uChromatic * (0.4 + r * 1.3) * uQuality;
    vec3 color = sampleRGB(vUv, chromaticAmount);

    // Soft circular vignette.
    float vignette = smoothstep(0.85, 0.32, r);
    vignette = mix(1.0, vignette, uVignette);

    if (uScanline > 0.001 && uQuality > 0.5) {
      float scan = sin(vUv.y * 920.0 + uTime * 1.6) * 0.5 + 0.5;
      color.rgb *= 1.0 - uScanline * 0.18 * (1.0 - scan * 0.6);
    }

    float n = noise(vec3(vUv * 800.0, uTime * 9.0)) - 0.5;
    color.rgb += n * uGrain * 0.4;

    // Develop glow: warm bright bloom centered on the imprint phase.
    float developGlow = smoothstep(0.0, 0.4, uDevelop) * (1.0 - smoothstep(0.4, 1.0, uDevelop));
    color.rgb += uTint * developGlow * 0.06;

    // Slight cool -> warm shift during the develop phase so the "imaging"
    // moment reads as color temperature change.
    color.rgb = mix(color.rgb, color.rgb * (1.0 + uTint * 0.3), uDevelop * 0.6);

    color.rgb *= vignette;
    gl_FragColor = vec4(color, 1.0);
  }
`;

let composer = null;
let developPass = null;
let bloomPass = null;
let offFuse = null;
let offDone = null;
let offMood = null;
let developStart = 0;
let developEnd = 0;
let activeMood = 'wistful';
let activeBloomStrength = 0.55;

function moodTint(mood) {
  switch (mood) {
    case 'vivid': return new THREE.Color('#ff9a78');
    case 'wistful': return new THREE.Color('#8fd6ff');
    case 'healing': return new THREE.Color('#7be2c8');
    default: return new THREE.Color('#8fd6ff');
  }
}

function moodBloomStrength(mood) {
  // Mood-specific bloom — vivid is the most luminous, healing is the gentlest.
  switch (mood) {
    case 'vivid': return 0.78;
    case 'wistful': return 0.55;
    case 'healing': return 0.45;
    default: return 0.55;
  }
}

function init() {
  const renderer = window.SM?.modules?.render3d?.scene?.getRenderer?.();
  const scene = window.SM?.modules?.render3d?.scene?.getScene?.();
  const camera = window.SM?.modules?.render3d?.scene?.getCamera?.();
  if (!renderer || !scene || !camera) return;

  composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  composer.setSize(window.innerWidth, window.innerHeight);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // UnrealBloomPass: extracts bright pixels, blurs them, and adds them back.
  // Resolution arg is the internal blur buffer; lower = more pronounced glow.
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    activeBloomStrength, // strength
    0.65,                // radius
    0.62,                // threshold (only pixels brighter than this glow)
  );
  composer.addPass(bloomPass);

  developPass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uDevelop: { value: 0 },
      uGrain: { value: 0.18 },
      uVignette: { value: 0.32 },
      uScanline: { value: 0.12 },
      uChromatic: { value: 0.0028 },
      uQuality: { value: 1.0 },
      uTint: { value: moodTint(activeMood) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: DEVELOP_FRAG,
  });
  composer.addPass(developPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  // Hook the existing render loop in scene.js to use the composer when present.
  window.SM.composer = {
    render() {
      developPass.uniforms.uTime.value = performance.now() * 0.001;
      if (developStart && developEnd) {
        const now = performance.now();
        const p = Math.max(0, Math.min(1, (now - developStart) / Math.max(1, developEnd - developStart)));
        developPass.uniforms.uDevelop.value = p;
      } else {
        developPass.uniforms.uDevelop.value = 0;
      }
      // Ramp bloom strength during the develop phase so the imaging
      // moment feels hot, then settles.
      if (bloomPass && developStart) {
        const now = performance.now();
        const total = Math.max(1, developEnd - developStart);
        const t = (now - developStart) / total;
        const peak = 0.35 * Math.exp(-Math.pow((t - 0.35) * 4.0, 2));
        bloomPass.strength = activeBloomStrength + peak;
      } else if (bloomPass) {
        bloomPass.strength = activeBloomStrength;
      }
      composer.render();
    },
    setSize(w, h) {
      composer.setSize(w, h);
      if (bloomPass) bloomPass.setSize(w, h);
    },
  };

  offFuse = window.SM.bus.on('aggregate:fuse-start', () => {
    developStart = performance.now();
    developEnd = developStart + 1600;
  });
  offDone = window.SM.bus.on('aggregate:done', () => {
    developStart = 0;
    developEnd = 0;
  });
  offMood = window.SM.bus.on('mood:change', ({ name }) => {
    if (name) {
      activeMood = name;
      developPass.uniforms.uTint.value = moodTint(name);
      activeBloomStrength = moodBloomStrength(name);
    }
  });
  // Quality: 0..1, ramped by callers (UI button, settings). High = full
  // effects; low = drop chromatic + scanlines for older GPUs.
  window.SM.setQuality = (q) => {
    if (developPass) developPass.uniforms.uQuality.value = Math.max(0, Math.min(1, q));
  };
  if (typeof window.SM.quality === 'number') {
    developPass.uniforms.uQuality.value = window.SM.quality;
  } else {
    // Auto: software WebGL gets low quality by default so the smoke test
    // (and old hardware) doesn't tank. Real GPUs run high.
    const gl = renderer?.getContext?.();
    const isSoftware = !gl || (
      gl.getExtension('WEBGL_debug_renderer_info') === null &&
      navigator.userAgent.includes('HeadlessChrome')
    );
    developPass.uniforms.uQuality.value = isSoftware ? 0.35 : 1.0;
  }
}

function destroy() {
  offFuse?.();
  offDone?.();
  offMood?.();
  offFuse = null;
  offDone = null;
  offMood = null;
  composer = null;
  developPass = null;
  bloomPass = null;
  developStart = 0;
  developEnd = 0;
}

export {
  init,
  destroy,
};

