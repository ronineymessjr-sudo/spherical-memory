import { onLanguageChange, t, toggleLang } from '../core/i18n.js';

let fileChangeHandler = null;
let randomizeHandler = null;
let presetHandler = null;
let languageToggleHandler = null;
let dragEnterHandler = null;
let dragLeaveHandler = null;
let dragOverHandler = null;
let dropHandler = null;
let offMaterials = null;
let offLanguage = null;
let dragDepth = 0;

function getStats() {
  const materials = window.SM.materials ?? [];
  const shardCount = window.SM.materialAssignments?.length ?? 0;
  const videoCount = materials.filter((item) => item.type === 'video').length;
  const panoramaCount = materials.filter((item) => item.projection === 'panorama').length;
  const imageCount = materials.length - videoCount;

  return {
    materials,
    shardCount,
    videoCount,
    panoramaCount,
    imageCount,
  };
}

function getSummary() {
  const { materials, shardCount, imageCount, videoCount } = getStats();

  if (!materials.length) {
    return t('upload.emptySummary');
  }

  if (materials.length < shardCount) {
    return t('upload.expandedSummary', { imageCount, videoCount, shardCount });
  }

  return t('upload.liveSummary', { imageCount, videoCount, shardCount });
}

function getFormatSummary() {
  const { materials, panoramaCount, imageCount, videoCount } = getStats();

  if (!materials.length) {
    return t('upload.emptyFormat');
  }

  if (!panoramaCount) {
    return t('upload.flatFormat', { imageCount, videoCount });
  }

  if (panoramaCount === materials.length) {
    return t('upload.fullPanoFormat', { total: materials.length });
  }

  return t('upload.mixedFormat', { panoramaCount });
}

function getListPreview() {
  const { materials } = getStats();
  if (!materials.length) {
    return `<li class="upload-list-empty">${t('upload.listEmpty')}</li>`;
  }

  return materials.slice(0, 5).map((item, index) => {
    const badge = item.type === 'video'
      ? t('upload.itemVideo')
      : item.projection === 'panorama'
        ? t('upload.itemPano')
        : t('upload.itemImage');
    return `<li><span>${index + 1}. ${item.name}</span><strong>${badge}</strong></li>`;
  }).join('') + (materials.length > 5
    ? `<li class="upload-list-more">${t('upload.listMore', { remaining: materials.length - 5 })}</li>`
    : '');
}

function setDropState(active) {
  const zone = document.getElementById('upload-dropzone');
  if (!zone) return;
  zone.dataset.drag = active ? '1' : '0';
}

function renderStatus() {
  const summaryEl = document.getElementById('upload-summary');
  const countEl = document.getElementById('upload-count');
  const formatEl = document.getElementById('upload-format-summary');
  const listEl = document.getElementById('upload-list');
  if (!summaryEl || !countEl || !formatEl || !listEl) return;

  const { materials, shardCount, imageCount, videoCount, panoramaCount } = getStats();
  countEl.textContent = t('upload.count', { materialCount: materials.length, shardCount });
  summaryEl.textContent = getSummary();
  formatEl.textContent = `${getFormatSummary()}${panoramaCount ? t('upload.panoHint') : ''}`;
  listEl.innerHTML = getListPreview();

  const tagsEl = document.getElementById('upload-stats');
  if (tagsEl) {
    tagsEl.innerHTML = `
      <span>${t('upload.imageBadge', { imageCount })}</span>
      <span>${t('upload.videoBadge', { videoCount })}</span>
      <span>${t('upload.panoBadge', { panoramaCount })}</span>
    `;
  }

  const toggleEl = document.getElementById('upload-lang-toggle');
  if (toggleEl) toggleEl.textContent = t('upload.toggle');
}

function handleFiles(files) {
  window.SM.modules.upload?.materialRouter?.hydrateFromFiles?.(files);
  dragDepth = 0;
  setDropState(false);
}

function render(force = false) {
  const container = document.getElementById('upload-container');
  if (!container || (!force && container.dataset.ready === '1')) return;

  container.dataset.ready = '1';
  container.innerHTML = `
    <div class="upload-panel">
      <div class="upload-copy">
        <div class="upload-title-row">
          <strong>${t('upload.title')}</strong>
          <button id="upload-lang-toggle" class="upload-button upload-button-compact" type="button">${t('upload.toggle')}</button>
        </div>
        <span id="upload-count"></span>
        <p id="upload-summary"></p>
        <p id="upload-format-summary" class="upload-format-summary"></p>
      </div>
      <div id="upload-stats" class="upload-badges"></div>
      <label id="upload-dropzone" class="upload-picker" for="upload-images" data-drag="0">
        <span>${t('upload.dropTitle')}</span>
        <small>${t('upload.dropHint')}</small>
        <input id="upload-images" type="file" accept="image/*,video/*" multiple>
      </label>
      <div class="upload-actions">
        <button id="upload-randomize" class="upload-button alt" type="button">${t('upload.shuffle')}</button>
        <button id="upload-preset" class="upload-button" type="button">${t('upload.restore')}</button>
      </div>
      <ul id="upload-list" class="upload-list"></ul>
    </div>
  `;

  const input = container.querySelector('#upload-images');
  const randomizeButton = container.querySelector('#upload-randomize');
  const presetButton = container.querySelector('#upload-preset');
  const languageToggleButton = container.querySelector('#upload-lang-toggle');
  const dropzone = container.querySelector('#upload-dropzone');

  fileChangeHandler = (event) => {
    const files = Array.from(event.target.files ?? []);
    handleFiles(files);
    event.target.value = '';
  };

  randomizeHandler = () => {
    window.SM.modules.render3d?.shardMesh?.randomizeTopology?.();
    window.SM.modules.upload?.materialRouter?.randomizeAssignments?.();
  };

  presetHandler = () => {
    window.SM.modules.upload?.materialRouter?.usePresetMaterials?.();
  };

  languageToggleHandler = () => {
    toggleLang();
  };

  dragEnterHandler = (event) => {
    event.preventDefault();
    dragDepth += 1;
    setDropState(true);
  };

  dragLeaveHandler = (event) => {
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) setDropState(false);
  };

  dragOverHandler = (event) => {
    event.preventDefault();
    setDropState(true);
  };

  dropHandler = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files ?? []);
    handleFiles(files);
  };

  input?.addEventListener('change', fileChangeHandler);
  randomizeButton?.addEventListener('click', randomizeHandler);
  presetButton?.addEventListener('click', presetHandler);
  languageToggleButton?.addEventListener('click', languageToggleHandler);
  dropzone?.addEventListener('dragenter', dragEnterHandler);
  dropzone?.addEventListener('dragleave', dragLeaveHandler);
  dropzone?.addEventListener('dragover', dragOverHandler);
  dropzone?.addEventListener('drop', dropHandler);
  renderStatus();
}

function init() {
  render();
  offMaterials = window.SM.bus.on('materials:updated', renderStatus);
  offLanguage = onLanguageChange(() => {
    render(true);
    renderStatus();
  });
  renderStatus();
}

function destroy() {
  const container = document.getElementById('upload-container');
  container?.querySelector('#upload-images')?.removeEventListener('change', fileChangeHandler);
  container?.querySelector('#upload-randomize')?.removeEventListener('click', randomizeHandler);
  container?.querySelector('#upload-preset')?.removeEventListener('click', presetHandler);
  container?.querySelector('#upload-lang-toggle')?.removeEventListener('click', languageToggleHandler);
  container?.querySelector('#upload-dropzone')?.removeEventListener('dragenter', dragEnterHandler);
  container?.querySelector('#upload-dropzone')?.removeEventListener('dragleave', dragLeaveHandler);
  container?.querySelector('#upload-dropzone')?.removeEventListener('dragover', dragOverHandler);
  container?.querySelector('#upload-dropzone')?.removeEventListener('drop', dropHandler);
  offMaterials?.();
  offLanguage?.();
  offMaterials = null;
  offLanguage = null;
  fileChangeHandler = null;
  randomizeHandler = null;
  presetHandler = null;
  languageToggleHandler = null;
  dragEnterHandler = null;
  dragLeaveHandler = null;
  dragOverHandler = null;
  dropHandler = null;
  dragDepth = 0;
}

export {
  init,
  destroy,
};
