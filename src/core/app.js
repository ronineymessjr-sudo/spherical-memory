import { EventBus } from './event-bus.js';
import { StateMachine } from './state-machine.js';
import { UnifiedInput } from '../input/unified-input.js';

window.SM = {
  version: '1.0.0',
  debug: window.SM_DEBUG_FLAGS?.debug ?? false,
  startTime: Date.now(),
  lang: 'en',
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

const CORE_SEQUENCE = [
  ['core', 'i18n', () => import('./i18n.js')],
  ['render3d', 'scene', () => import('../render3d/scene.js')],
  ['render3d', 'sphereShell', () => import('../render3d/sphere-shell.js')],
  ['render3d', 'shardMesh', () => import('../render3d/shard-mesh.js')],
  ['render3d', 'shardSeam', () => import('../render3d/shard-seam.js')],
  ['render3d', 'ionParticles', () => import('../render3d/ion-particles.js')],
  ['render3d', 'panoramaBind', () => import('../render3d/panorama-bind.js')],
  ['render3d', 'shardFocusTick', () => import('../render3d/shard-focus-tick.js')],
  ['render3d', 'materialTheme', () => import('../render3d/material-theme.js')],
  ['render3d', 'postFx', () => import('../render3d/post-fx.js')],
  ['render3d', 'envMap', () => import('../render3d/env-map.js')],
  ['upload', 'filePicker', () => import('../upload/file-picker.js')],
  ['upload', 'materialRouter', () => import('../upload/material-router.js')],
  ['anim', 'mirrorCrack', () => import('../anim/mirror-crack.js')],
  ['anim', 'mirrorShards', () => import('../anim/mirror-shards.js')],
  ['anim', 'aggregate', () => import('../anim/aggregate.js')],
  ['anim', 'shardRotate', () => import('../anim/shard-rotate.js')],
  ['anim', 'shardInteract', () => import('../anim/shard-interact.js')],
  ['anim', 'breath', () => import('../anim/breath.js')],
  ['input', 'keyboardShortcuts', () => import('../input/keyboard-shortcuts.js')],
  ['ui', 'cover', () => import('../ui/cover.js')],
  ['ui', 'mirror', () => import('../ui/mirror.js')],
  ['ui', 'hud', () => import('../ui/hud.js')],
  ['ui', 'memoryCard', () => import('../ui/memory-card.js')],
  ['ui', 'memoryToolbar', () => import('../ui/memory-toolbar.js')],
  ['ui', 'storyModal', () => import('../ui/story-modal.js')],
  ['ui', 'onboarding', () => import('../ui/onboarding.js')],
  ['demo', 'mode', () => import('../demo/mode.js')],
];

const DEFERRED_SEQUENCE = [
  ['output', 'screenshot', () => import('../output/screenshot.js')],
  ['output', 'share', () => import('../output/share.js')],
  ['output', 'recorder', () => import('../output/recorder.js')],
  ['output', 'dedication', () => import('../output/dedication.js')],
  ['audio', 'soundFx', () => import('../audio/sound-fx.js')],
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

async function loadModules(sequence) {
  for (const [category, name, loader] of sequence) {
    try {
      const mod = await loader();
      if (!SM.modules[category]) SM.modules[category] = {};
      SM.modules[category][name] = mod;
      try {
        mod.init?.();
      } catch (initError) {
        // A module loaded but its init threw. The app must not black-screen —
        // we mark the module as broken so consumers can detect it.
        SM.modules[category][name] = { ...mod, init: undefined, __broken: true, __error: initError };
        console.error(`[SM] init failed ${category}.${name}:`, initError);
        showErrorChip(`${category}.${name} init failed`);
      }
      console.log(`%c[SM] ok ${category}.${name}`, 'color:#88ff88');
    } catch (error) {
      console.warn(`[SM] skip ${category}.${name}:`, error?.message || error);
    }
  }
}

let errorChipEl = null;
function showErrorChip(message) {
  if (!errorChipEl) {
    errorChipEl = document.createElement('div');
    errorChipEl.className = 'sm-error-chip';
    errorChipEl.textContent = message;
    document.body.appendChild(errorChipEl);
  } else {
    errorChipEl.textContent = `${errorChipEl.textContent} · ${message}`;
  }
  errorChipEl.dataset.visible = '1';
  window.setTimeout(() => {
    if (errorChipEl) errorChipEl.dataset.visible = '0';
  }, 4000);
}

function queueDeferredModules() {
  const loadDeferred = async () => {
    await loadModules(DEFERRED_SEQUENCE);
    SM.bus.emit('app:deferred-ready');
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      loadDeferred().catch((error) => {
        console.warn('[SM] deferred init failed:', error?.message || error);
      });
    }, { timeout: 1200 });
    return;
  }

  window.setTimeout(() => {
    loadDeferred().catch((error) => {
      console.warn('[SM] deferred init failed:', error?.message || error);
    });
  }, 180);
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
  await loadModules(CORE_SEQUENCE);
  await loadFallbackIfNeeded();
  queueDeferredModules();

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
