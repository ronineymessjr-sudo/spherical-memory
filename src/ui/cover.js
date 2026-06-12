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
          <div class="cover-hero-ring ring-a"></div>
          <div class="cover-hero-ring ring-b"></div>
          <div class="cover-hero-ring ring-c"></div>
          <div class="cover-hero-core"></div>
          <span class="cover-hero-shard shard-a"></span>
          <span class="cover-hero-shard shard-b"></span>
          <span class="cover-hero-shard shard-c"></span>
          <span class="cover-hero-shard shard-d"></span>
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

  updateLoadingState();
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
