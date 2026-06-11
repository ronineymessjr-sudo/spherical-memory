// Post-processing chain for spherical-memory.
// - RenderPass       (the actual scene)
// - FilmDevelopPass  (grain + develop-glow + soft vignette tied to the imprint phase)
//
// Grain / film-develop shader runs on the rendered frame and adds an extra
// layer of "this just crystallized from particles" feel. We feed it a uniform
// `uDevelop` that ramps 0 -> 1 over the imprint phase so the grain *fades in*
// along with the shard materialization, then *fades out* once the sphere is
// settled.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const DEVELOP_FRAG = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform float uDevelop;
  uniform float uGrain;
  uniform float uVignette;
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

  void main() {
    vec4 color = texture2D(tDiffuse, vUv);

    // Soft circular vignette.
    vec2 centered = vUv - 0.5;
    float r = length(centered);
    float vignette = smoothstep(0.85, 0.32, r);
    vignette = mix(1.0, vignette, uVignette);

    // Film grain. Animated noise per pixel scaled by uGrain.
    float n = noise(vec3(vUv * 1500.0, uTime * 13.0)) - 0.5;
    color.rgb += n * uGrain * 0.4;

    // Develop glow: warm bright bloom centered on the imprint phase.
    float developGlow = smoothstep(0.0, 0.4, uDevelop) * (1.0 - smoothstep(0.4, 1.0, uDevelop));
    color.rgb += uTint * developGlow * 0.06;

    // Slight cool -> warm shift during the develop phase so the "imaging"
    // moment reads as color temperature change.
    color.rgb = mix(color.rgb, color.rgb * (1.0 + uTint * 0.3), uDevelop * 0.6);

    color.rgb *= vignette;
    gl_FragColor = color;
  }
`;

let composer = null;
let developPass = null;
let offFuse = null;
let offDone = null;
let offMood = null;
let developStart = 0;
let developEnd = 0;
let activeMood = 'wistful';

function moodTint(mood) {
  switch (mood) {
    case 'vivid': return new THREE.Color('#ff9a78');
    case 'wistful': return new THREE.Color('#8fd6ff');
    case 'healing': return new THREE.Color('#7be2c8');
    default: return new THREE.Color('#8fd6ff');
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

  developPass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uDevelop: { value: 0 },
      uGrain: { value: 0.18 },
      uVignette: { value: 0.32 },
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
  // scene.js consults `window.SM.composer`; if defined it calls composer.render()
  // instead of renderer.render(scene, camera).
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
      composer.render();
    },
    setSize(w, h) { composer.setSize(w, h); },
  };

  // Bus hooks.
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
    }
  });

  // Resize.
  const resize = () => composer.setSize(window.innerWidth, window.innerHeight);
  window.addEventListener('resize', resize);
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
  developStart = 0;
  developEnd = 0;
}

export {
  init,
  destroy,
};
