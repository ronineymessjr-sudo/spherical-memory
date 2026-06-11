import { onLanguageChange, t } from '../core/i18n.js';

let screenshotHandler = null;
let resetHandler = null;
let demoHandler = null;
let shareHandler = null;
let offFocus = null;
let offBlur = null;
let offState = null;
let offMaterials = null;
let offLanguage = null;
let offTitle = null;
let lastFocusPayload = null;

function getLibraryStats() {
  const materials = window.SM.materials ?? [];
  const videoCount = materials.filter((item) => item.type === 'video').length;
  const panoramaCount = materials.filter((item) => item.projection === 'panorama').length;

  return {
    total: materials.length,
    videoCount,
    panoramaCount,
    imageCount: materials.length - videoCount,
    shardCount: window.SM.materialAssignments?.length ?? 0,
  };
}

function updateFocusCard(payload = null) {
  lastFocusPayload = payload;
  const titleEl = document.getElementById('hud-focus-title');
  const metaEl = document.getElementById('hud-focus-meta');
  if (!titleEl || !metaEl) return;

  if (!payload) {
    titleEl.textContent = t('hud.defaultTitle');
    metaEl.textContent = t('hud.defaultMeta');
    return;
  }

  titleEl.textContent = payload.materialName || payload.shardId;
  metaEl.textContent = t('hud.focusMeta', payload);
}

function updateLibraryCard() {
  const statsEl = document.getElementById('hud-library-stats');
  const detailEl = document.getElementById('hud-library-detail');
  if (!statsEl || !detailEl) return;

  const stats = getLibraryStats();
  statsEl.textContent = t('hud.libraryStats', stats);
  detailEl.textContent = t('hud.libraryDetail', stats);
}

function render(force = false) {
  const container = document.getElementById('hud-container');
  if (!container || (!force && container.dataset.ready === '1')) return;

  container.dataset.ready = '1';
  container.innerHTML = `
    <div class="hud-stack">
      <div class="hud-card hud-title-card">
        <p class="hud-label">${t('toolbar.aiTitle')}</p>
        <strong id="hud-ai-title"></strong>
      </div>
      <div class="hud-card hud-focus-card">
        <p class="hud-label">${t('hud.currentFocus')}</p>
        <strong id="hud-focus-title">${t('hud.defaultTitle')}</strong>
        <p id="hud-focus-meta">${t('hud.defaultMeta')}</p>
      </div>
      <div class="hud-card hud-library-card">
        <p class="hud-label">${t('hud.libraryStatus')}</p>
        <strong id="hud-library-stats"></strong>
        <p id="hud-library-detail"></p>
      </div>
      <div class="hud-card hud-panel">
        <button id="hud-screenshot" class="hud-button" type="button">${t('hud.screenshot')}</button>
        <button id="hud-share" class="hud-button alt" type="button">${t('share.card')}</button>
        <button id="hud-reset" class="hud-button alt" type="button">${t('hud.reset')}</button>
        <button id="hud-demo" class="hud-button alt" type="button">${t('hud.demo')}</button>
      </div>
    </div>
  `;

  screenshotHandler = () => {
    window.SM.modules.output?.screenshot?.take?.();
  };

  resetHandler = () => {
    window.SM.modules.demo?.mode?.stop?.();
    window.SM.modules.render3d?.panoramaBind?.resetView?.();
    window.SM.modules.render3d?.shardMesh?.rotateTo?.(0, 0);
    window.SM.modules.render3d?.scene?.setCameraDistance?.(4.6);
    window.SM.go('cover');
  };

  demoHandler = () => {
    window.SM.modules.demo?.mode?.start?.();
  };

  shareHandler = () => {
    window.SM.modules.output?.share?.share?.();
  };

  container.querySelector('#hud-screenshot')?.addEventListener('click', screenshotHandler);
  container.querySelector('#hud-share')?.addEventListener('click', shareHandler);
  container.querySelector('#hud-reset')?.addEventListener('click', resetHandler);
  container.querySelector('#hud-demo')?.addEventListener('click', demoHandler);
}

function init() {
  render();
  updateFocusCard(lastFocusPayload);
  updateLibraryCard();
  offLanguage = onLanguageChange(() => {
    render(true);
    updateFocusCard(lastFocusPayload);
    updateLibraryCard();
  });
  offFocus = window.SM.bus.on('shard:focus', updateFocusCard);
  offBlur = window.SM.bus.on('shard:blur', () => updateFocusCard());
  offState = window.SM.bus.on('state:change', ({ to }) => {
    if (to !== 'sphere' && to !== 'share') {
      updateFocusCard();
    }
  });
  offMaterials = window.SM.bus.on('materials:updated', updateLibraryCard);
  // AI title surface
  offTitle = window.SM.bus.on('materials:updated', updateAiTitle);
  updateAiTitle();
}

function updateAiTitle() {
  const titleEl = document.getElementById('hud-ai-title');
  if (!titleEl) return;
  titleEl.textContent = window.SM.aiTitle || '';
}

function destroy() {
  const container = document.getElementById('hud-container');
  container?.querySelector('#hud-screenshot')?.removeEventListener('click', screenshotHandler);
  container?.querySelector('#hud-share')?.removeEventListener('click', shareHandler);
  container?.querySelector('#hud-reset')?.removeEventListener('click', resetHandler);
  container?.querySelector('#hud-demo')?.removeEventListener('click', demoHandler);
  offFocus?.();
  offBlur?.();
  offState?.();
  offMaterials?.();
  offLanguage?.();
  offTitle?.();
  offFocus = null;
  offBlur = null;
  offState = null;
  offMaterials = null;
  offLanguage = null;
  offTitle = null;
  screenshotHandler = null;
  resetHandler = null;
  demoHandler = null;
  shareHandler = null;
}

export {
  init,
  destroy,
};
