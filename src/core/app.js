import { EventBus } from './event-bus.js';
import { StateMachine } from './state-machine.js';
import { UnifiedInput } from '../input/unified-input.js';

window.SM = {
  version: '1.0.0',
  debug: window.SM_DEBUG_FLAGS?.debug ?? false,
  startTime: Date.now(),
  currentState: 'cover',
  prevState: null,
  materials: [],
  materialAssignments: [],
  shards: [],
  activeShardId: null,
  sphereRotation: { x: 0, y: 0 },
  cameraDistance: 4.6,
  renderMode: '3d',
  webglOK: true,
  modules: {},
  bus: null,
  input: null,
  state: null,
  go: () => false,
};

const SM = window.SM;

const INIT_SEQUENCE = [
  ['render3d', 'scene', () => import('../render3d/scene.js')],
  ['render3d', 'sphereShell', () => import('../render3d/sphere-shell.js')],
  ['render3d', 'shardMesh', () => import('../render3d/shard-mesh.js')],
  ['render3d', 'shardSeam', () => import('../render3d/shard-seam.js')],
  ['render3d', 'ionParticles', () => import('../render3d/ion-particles.js')],
  ['render3d', 'panoramaBind', () => import('../render3d/panorama-bind.js')],
  ['upload', 'filePicker', () => import('../upload/file-picker.js')],
  ['upload', 'materialRouter', () => import('../upload/material-router.js')],
  ['anim', 'mirrorCrack', () => import('../anim/mirror-crack.js')],
  ['anim', 'aggregate', () => import('../anim/aggregate.js')],
  ['anim', 'shardRotate', () => import('../anim/shard-rotate.js')],
  ['anim', 'shardInteract', () => import('../anim/shard-interact.js')],
  ['ui', 'cover', () => import('../ui/cover.js')],
  ['ui', 'mirror', () => import('../ui/mirror.js')],
  ['ui', 'hud', () => import('../ui/hud.js')],
  ['output', 'screenshot', () => import('../output/screenshot.js')],
  ['output', 'share', () => import('../output/share.js')],
  ['audio', 'soundFx', () => import('../audio/sound-fx.js')],
  ['demo', 'mode', () => import('../demo/mode.js')],
];

function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

function applyStateToDom(nextState) {
  const visibleStates = nextState === 'cracking'
    ? new Set(['mirror', 'cracking', 'sphere'])
    : new Set([nextState]);

  ['cover', 'mirror', 'cracking', 'sphere', 'share'].forEach((stateName) => {
    const element = document.getElementById(`${stateName}-container`);
    if (element) {
      element.style.display = visibleStates.has(stateName) ? 'block' : 'none';
    }
  });

  document.body.dataset.state = nextState;
}

function bindInputTargets() {
  const targets = [
    ['cover-container', 'cover'],
    ['mirror-container', 'mirror'],
    ['sphere-container', 'sphere'],
    ['hud-container', 'hud-btn'],
    ['upload-container', 'upload'],
  ];

  targets.forEach(([id, targetName]) => {
    const element = document.getElementById(id);
    if (element) SM.input.bindTarget(element, targetName);
  });
}

async function loadModules() {
  for (const [category, name, loader] of INIT_SEQUENCE) {
    try {
      const mod = await loader();
      if (!SM.modules[category]) SM.modules[category] = {};
      SM.modules[category][name] = mod;
      mod.init?.();
      console.log(`%c[SM] ok ${category}.${name}`, 'color:#88ff88');
    } catch (error) {
      console.warn(`[SM] skip ${category}.${name}:`, error?.message || error);
    }
  }
}

async function loadFallbackIfNeeded() {
  if (SM.renderMode !== '2d') return;

  try {
    const mod = await import('../render2d/fallback.js');
    SM.modules.render2d = { fallback: mod };
    mod.init?.();
    console.log('%c[SM] ok render2d.fallback', 'color:#ffff88');
  } catch (error) {
    console.error('[SM] render2d.fallback failed:', error);
  }
}

async function init() {
  console.log(`%c[SM] spherical-memory v${SM.version}`, 'color:#88ddff;font-weight:bold;font-size:14px');

  SM.bus = new EventBus();
  SM.state = new StateMachine(SM.bus);
  SM.go = (nextState, payload) => SM.state.go(nextState, payload);
  SM.input = new UnifiedInput(SM.bus);
  SM.webglOK = detectWebGL();
  SM.renderMode = SM.webglOK ? '3d' : '2d';

  applyStateToDom(SM.currentState);
  SM.bus.on('state:change', ({ to }) => {
    applyStateToDom(to);
  });

  bindInputTargets();
  await loadModules();
  await loadFallbackIfNeeded();

  if (SM.debug) {
    console.log('%c[SM] debug mode enabled: try SM.go("sphere")', 'color:#ffaa00');
  }

  if (window.SM_DEBUG_FLAGS?.autoclick) {
    const tapCount = parseInt(window.SM_DEBUG_FLAGS.autoclick, 10) || 3;
    runAutoClick(tapCount);
  }

  if (window.SM_DEBUG_FLAGS?.demo) {
    window.setTimeout(() => SM.modules.demo?.mode?.start?.(), 1000);
  }

  SM.bus.emit('app:ready');
  console.log('%c[SM] ready', 'color:#88ddff;font-weight:bold');
}

async function runAutoClick(tapCount) {
  console.log(`[autoclick] will click ${tapCount} times`);
  await new Promise((resolve) => window.setTimeout(resolve, 500));
  SM.go('mirror');
  await new Promise((resolve) => window.setTimeout(resolve, 500));

  for (let index = 0; index < tapCount; index += 1) {
    SM.bus.emit('input:tap', {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      target: 'mirror',
    });
    console.log(`[autoclick] ${index + 1}/${tapCount}`);
    await new Promise((resolve) => window.setTimeout(resolve, 800));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
