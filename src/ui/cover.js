import { onLanguageChange, t } from '../core/i18n.js';

let offTap = null;
let offLanguage = null;

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
        <p class="eyebrow">SPHERICAL MEMORY</p>
        <h1>${t('cover.title')}</h1>
        <p class="cover-copy">
          ${t('cover.copy')}
        </p>
        <div class="cover-preview-grid">
          <article class="cover-preview-card" style="background-image:linear-gradient(180deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.58)), url('./assets/fallback/travel-media/travel-01-seaside.webp')">
            <span>${t('cover.preview1')}</span>
          </article>
          <article class="cover-preview-card" style="background-image:linear-gradient(180deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.58)), url('./assets/fallback/travel-media/travel-04-city-night.webp')">
            <span>${t('cover.preview2')}</span>
          </article>
          <article class="cover-preview-card" style="background-image:linear-gradient(180deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.58)), url('./assets/fallback/travel-media/travel-08-island-pier.webp')">
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
        <button id="enter-memory-button" class="primary-cta" type="button">${t('cover.cta')}</button>
      </div>
    </section>
  `;

  container.querySelector('#enter-memory-button')?.addEventListener('click', () => {
    window.SM.go('mirror');
  });
}

function init() {
  render();
  offLanguage = onLanguageChange(() => render(true));

  offTap = window.SM.bus.on('input:tap', ({ target }) => {
    if (window.SM.currentState !== 'cover') return;
    if (target !== 'cover') return;
    window.SM.go('mirror');
  });
}

function destroy() {
  offTap?.();
  offLanguage?.();
  offTap = null;
  offLanguage = null;
}

export {
  init,
  destroy,
};
