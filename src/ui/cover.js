import { onLanguageChange, t } from '../core/i18n.js';

let offTap = null;
let offLanguage = null;
let offProgress = null;
let offReady = null;

function render(force = false) {
  const container = document.getElementById('cover-container');
  if (!container || (!force && container.dataset.ready === '1')) return;

  container.dataset.ready = '1';
  container.innerHTML = `
    <section class="cover-screen">
      <div class="cover-orbit orbit-a"></div>
      <div class="cover-orbit orbit-b"></div>
      <div class="cover-glow"></div>
      <div class="cover-card">
        <div class="cover-hero" aria-hidden="true">
          <div class="cover-hero-halo"></div>
          <div class="cover-hero-shards" data-shard-host></div>
          <div class="cover-hero-rings">
            <div class="cover-hero-ring ring-a"></div>
            <div class="cover-hero-ring ring-b"></div>
            <div class="cover-hero-ring ring-c"></div>
          </div>
          <div class="cover-hero-core"></div>
        </div>
        <p class="eyebrow">SPHERICAL MEMORY</p>
        <h1>${t('cover.title')}</h1>
        <p class="cover-copy">
          ${t('cover.copy')}
        </p>
        <div class="cover-preview-grid">
          <article class="cover-preview-card" style="--card-index:0;background-image:linear-gradient(180deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.58)), url('./assets/fallback/travel-media/travel-01-seaside.webp')">
            <span>${t('cover.preview1')}</span>
          </article>
          <article class="cover-preview-card" style="--card-index:1;background-image:linear-gradient(180deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.58)), url('./assets/fallback/travel-media/travel-04-city-night.webp')">
            <span>${t('cover.preview2')}</span>
          </article>
          <article class="cover-preview-card" style="--card-index:2;background-image:linear-gradient(180deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.58)), url('./assets/fallback/travel-media/travel-08-island-pier.webp')">
            <span>${t('cover.preview3')}</span>
          </article>
        </div>
        <div class="cover-stats">
          <div class="cover-stat">
            <strong>${t('cover.stat1Title')}</strong>
            <span>${t('cover.stat1Body')}</span>
          </div>
          <div class="cover-stat">
            <strong>${t('cover.stat2Title')}</strong>
            <span>${t('cover.stat2Body')}</span>
          </div>
          <div class="cover-stat">
            <strong>${t('cover.stat3Title')}</strong>
            <span>${t('cover.stat3Body')}</span>
          </div>
        </div>
        <div class="cover-cta-stack">
          <button id="enter-memory-button" class="primary-cta" type="button">${t('cover.cta')}</button>
          <p id="cover-loading-status" class="cover-loading-status"></p>
        </div>
      </div>
    </section>
  `;

  container.querySelector('#enter-memory-button')?.addEventListener('click', () => {
    if (!window.SM.appReady) return;
    window.SM.go('mirror');
  });

  populateShards(container);

  updateLoadingState();
}

// Populate the cover hero with a randomized set of orbiting shards.
// Each shard gets a unique orbit radius, tilt, starting phase (animation
// delay), size, and drift speed — the visual result is a slowly turning
// planet with a small constellation of debris that never follows the same
// path twice across reloads. The single shared `cover-shard-orbit`
// keyframe drives z-ordering via scale + opacity so fragments passing
// behind the planet fade out instead of clipping through the core.
function populateShards(container) {
  const host = container.querySelector('[data-shard-host]');
  if (!host || host.dataset.populated === '1') return;
  host.dataset.populated = '1';

  const count = 18;
  const baseOrbit = 60; // px radius at 1× (hero width ~360px, so 60 → ~33% of half-width)
  for (let i = 0; i < count; i += 1) {
    const shard = document.createElement('span');
    shard.className = 'cover-hero-shard';

    // Distribute starting phase fully across the orbit — we want a
    // handful of shards visible at any static frame, not a clump.
    // `phase` is in degrees; it's added to --sm-shard-rot in the
    // transform pipeline so each shard starts at a different angle
    // along its own great circle. `delay` is kept for animation-delay
    // (lets a shard begin at "60% into a previous revolution").
    const phase = (i / count) * 360 + (Math.random() - 0.5) * (360 / count) * 0.6;
    const radius = baseOrbit * (0.7 + Math.random() * 0.7);
    const tilt = (Math.random() - 0.5) * 70; // -35..+35 deg
    const size = 10 + Math.random() * 18;     // 10..28 px
    const speed = 80 + Math.random() * 30;   // 80..110s per orbit
    const delay = -(Math.random() * speed);  // randomize start anywhere in the loop
    const hue = 250 + Math.random() * 70;    // 250..320 — purple→magenta
    const brightness = 70 + Math.random() * 25;

    shard.style.setProperty('--orbit-radius', `${radius.toFixed(1)}px`);
    shard.style.setProperty('--orbit-tilt', `${tilt.toFixed(1)}deg`);
    shard.style.setProperty('--orbit-size', `${size.toFixed(1)}px`);
    shard.style.setProperty('--orbit-hue', `${hue.toFixed(0)}`);
    shard.style.setProperty('--orbit-bright', `${brightness.toFixed(0)}%`);
    shard.style.setProperty('--orbit-speed', `${speed.toFixed(1)}s`);
    shard.style.setProperty('--orbit-delay', `${delay.toFixed(1)}s`);
    shard.style.setProperty('--orbit-phase', `${phase.toFixed(1)}deg`);
    shard.style.animationDuration = `${speed.toFixed(1)}s`;
    shard.style.animationDelay = `${delay.toFixed(1)}s`;

    host.appendChild(shard);
  }
}

function updateLoadingState() {
  const button = document.getElementById('enter-memory-button');
  const status = document.getElementById('cover-loading-status');
  if (!button || !status) return;

  const isZh = window.SM.lang === 'zh';
  const progress = Math.max(6, Math.min(100, Math.round((window.SM.loadingProgress || 0) * 100)));
  const ready = !!window.SM.appReady;

  button.disabled = !ready;
  button.dataset.ready = ready ? '1' : '0';
  button.textContent = ready
    ? t('cover.cta')
    : (isZh ? `正在构建记忆球 ${progress}%` : `Building the sphere ${progress}%`);

  status.textContent = ready
    ? (isZh ? '已就绪，点击进入镜面并开始演示。' : 'Ready. Enter the mirror and start the demo.')
    : (isZh
      ? '封面已先显示，Three.js 碎片、粒子与材质动效仍在后台准备。'
      : 'The hero is already live while Three.js shards, particles, and materials finish preparing in the background.');
}

function init() {
  render();
  offLanguage = onLanguageChange(() => {
    render(true);
    updateLoadingState();
  });
  offProgress = window.SM.bus.on('app:loading-progress', updateLoadingState);
  offReady = window.SM.bus.on('app:ready', updateLoadingState);

  offTap = window.SM.bus.on('input:tap', ({ target }) => {
    if (window.SM.currentState !== 'cover') return;
    if (target !== 'cover') return;
    if (!window.SM.appReady) return;
    window.SM.go('mirror');
  });
}

function destroy() {
  offTap?.();
  offLanguage?.();
  offProgress?.();
  offReady?.();
  offTap = null;
  offLanguage = null;
  offProgress = null;
  offReady = null;
}

export {
  init,
  destroy,
};
