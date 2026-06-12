import { EventBus } from './event-bus.js';
import { StateMachine } from './state-machine.js';
import { UnifiedInput } from '../input/unified-input.js';

window.SM = {
  version: '1.0.0',
  debug: window.SM_DEBUG_FLAGS?.debug ?? false,
  startTime: Date.now(),
  lang: 'en',
  appReady: false,
  bootReady: false,
  loadingPhase: 'boot',
  loadingProgress: 0,
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

const BOOT_SEQUENCE = [
  ['core', 'i18n', () => import('./i18n.js')],
  ['upload', 'materialRouter', () => import('../upload/material-router.js')],
  ['upload', 'filePicker', () => import('../upload/file-picker.js')],
  ['ui', 'cover', () => import('../ui/cover.js')],
  ['ui', 'mirror', () => import('../ui/mirror.js')],
];

const EXPERIENCE_SEQUENCE = [
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
  ['anim', 'mirrorCrack', () => import('../anim/mirror-crack.js')],
  ['anim', 'mirrorShards', () => import('../anim/mirror-shards.js')],
  ['anim', 'shockwave', () => import('../anim/shockwave.js')],
  ['anim', 'aggregate', () => import('../anim/aggregate.js')],
  ['anim', 'shardRotate', () => import('../anim/shard-rotate.js')],
  ['anim', 'shardInteract', () => import('../anim/shard-interact.js')],
  ['anim', 'breath', () => import('../anim/breath.js')],
  ['render3d', 'flowField', () => import('../render3d/flow-field.js')],
  ['render3d', 'galaxyInner', () => import('../render3d/galaxy-inner.js')],
  ['render3d', 'ribbonTrail', () => import('../render3d/ribbon-trail.js')],
  ['render3d', 'selectionRipple', () => import('../render3d/selection-ripple.js')],
  ['render3d', 'gpgpuCloud', () => import('../render3d/gpgpu-cloud.js')],
  ['render3d', 'textRibbon', () => import('../render3d/text-ribbon.js')],
  ['render3d', 'carousel', () => import('../render3d/carousel.js')],
  ['input', 'keyboardShortcuts', () => import('../input/keyboard-shortcuts.js')],
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
  ['render3d', 'spectrumRing', () => import('../render3d/spectrum-ring.js')],
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

function ensureBootSplash() {
  let splash = document.getElementById('boot-splash');
  if (splash) return splash;

  splash = document.createElement('div');
  splash.id = 'boot-splash';
  splash.className = 'boot-splash';
  splash.innerHTML = `
    <div class="boot-splash-backdrop"></div>
    <div class="boot-splash-stage" aria-hidden="true">
      <div class="boot-splash-orbit orbit-a"></div>
      <div class="boot-splash-orbit orbit-b"></div>
      <div class="boot-splash-orbit orbit-c"></div>
      <div class="boot-splash-core"></div>
      <div class="boot-splash-pulse"></div>
      <span class="boot-splash-shard shard-a"></span>
      <span class="boot-splash-shard shard-b"></span>
      <span class="boot-splash-shard shard-c"></span>
      <span class="boot-splash-shard shard-d"></span>
    </div>
    <div class="boot-splash-copy">
      <p class="boot-splash-eyebrow">SPHERICAL MEMORY</p>
      <h1 id="boot-splash-title">Waking the memory sphere</h1>
      <p id="boot-splash-detail" class="boot-splash-detail">Preparing the cover, media studio, and live 3D shard field.</p>
      <div class="boot-splash-progress-track">
        <div id="boot-splash-progress" class="boot-splash-progress-bar"></div>
      </div>
      <p id="boot-splash-meta" class="boot-splash-meta">0%</p>
    </div>
  `;
  document.body.appendChild(splash);
  document.body.dataset.boot = '1';
  return splash;
}

function updateBootSplash() {
  const splash = ensureBootSplash();
  const titleEl = splash.querySelector('#boot-splash-title');
  const detailEl = splash.querySelector('#boot-splash-detail');
  const metaEl = splash.querySelector('#boot-splash-meta');
  const progressEl = splash.querySelector('#boot-splash-progress');
  const progress = Math.round((SM.loadingProgress || 0) * 100);
  const loading = progress >= 100 ? 100 : Math.max(progress, 4);
  const isZh = SM.lang === 'zh';

  if (titleEl) {
    titleEl.textContent = isZh ? '正在唤醒记忆球' : 'Waking the memory sphere';
  }
  if (detailEl) {
    if (SM.appReady) {
      detailEl.textContent = isZh
        ? '首屏已就绪，正在把完整碎片球体验交给你。'
        : 'The opening hero is ready and the full shard sphere is now unlocked.';
    } else if (SM.bootReady) {
      detailEl.textContent = isZh
        ? '首屏已出现，后台继续构建 Three.js 碎片、粒子和材质动效。'
        : 'The hero is live while Three.js shards, particles, and material motion finish in the background.';
    } else {
      detailEl.textContent = isZh
        ? '先点亮封面与素材面板，再继续构建实时 3D 记忆球。'
        : 'Bringing up the hero and media panel first, then the real-time 3D memory sphere.';
    }
  }
  if (metaEl) {
    metaEl.textContent = SM.appReady
      ? (isZh ? '已完成 100%' : 'Ready 100%')
      : `${loading}%`;
  }
  if (progressEl) {
    progressEl.style.width = `${loading}%`;
  }
}

function dismissBootSplash() {
  const splash = document.getElementById('boot-splash');
  if (!splash || splash.dataset.dismissed === '1') return;
  splash.dataset.dismissed = '1';
  document.body.dataset.boot = '0';
  window.setTimeout(() => splash.remove(), 720);
}

function publishLoadingProgress(phase, loaded, total, label = '') {
  SM.loadingPhase = phase;
  SM.loadingProgress = total > 0 ? loaded / total : 1;
  document.body.dataset.appReady = SM.appReady ? '1' : '0';
  updateBootSplash();
  SM.bus?.emit?.('app:loading-progress', {
    phase,
    loaded,
    total,
    progress: SM.loadingProgress,
    label,
  });
}

function yieldToBrowser() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(resolve, 0);
    });
  });
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

async function loadModules(sequence, options = {}) {
  const total = options.total ?? sequence.length;
  const offset = options.offset ?? 0;
  const phase = options.phase ?? 'boot';

  for (const [index, [category, name, loader]] of sequence.entries()) {
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
    } finally {
      publishLoadingProgress(phase, offset + index + 1, total, `${category}.${name}`);
      if (options.yieldBetween) {
        await yieldToBrowser();
      }
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
  ensureBootSplash();

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
  const totalCoreModules = BOOT_SEQUENCE.length + EXPERIENCE_SEQUENCE.length;
  publishLoadingProgress('boot', 0, totalCoreModules, 'boot');
  await loadModules(BOOT_SEQUENCE, {
    phase: 'boot',
    total: totalCoreModules,
    offset: 0,
  });
  SM.bootReady = true;
  updateBootSplash();
  SM.bus.emit('app:boot-ready');
  dismissBootSplash();

  await loadModules(EXPERIENCE_SEQUENCE, {
    phase: 'experience',
    total: totalCoreModules,
    offset: BOOT_SEQUENCE.length,
    yieldBetween: true,
  });
  await loadFallbackIfNeeded();
  SM.appReady = true;
  publishLoadingProgress('ready', totalCoreModules, totalCoreModules, 'ready');
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
