let fileChangeHandler = null;
let randomizeHandler = null;
let presetHandler = null;
let dragEnterHandler = null;
let dragLeaveHandler = null;
let dragOverHandler = null;
let dropHandler = null;
let offMaterials = null;
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
    return 'No media loaded yet. The travel demo set is standing by.';
  }

  if (materials.length < shardCount) {
    return `${imageCount} images and ${videoCount} videos loaded, expanded to ${shardCount} sphere shards.`;
  }

  return `${imageCount} images and ${videoCount} videos loaded across ${shardCount} live shards.`;
}

function getFormatSummary() {
  const { materials, panoramaCount, imageCount, videoCount } = getStats();

  if (!materials.length) {
    return 'You can keep uploading in batches. New files will append onto the current sphere.';
  }

  if (!panoramaCount) {
    return `${imageCount} flat images and ${videoCount} videos are using cropped shard mapping.`;
  }

  if (panoramaCount === materials.length) {
    return `All ${materials.length} items are using panorama sphere mapping.`;
  }

  return `${panoramaCount} panorama items were detected, while the rest keep flat crop distortion.`;
}

function getListPreview() {
  const { materials } = getStats();
  if (!materials.length) {
    return '<li class="upload-list-empty">Demo library waiting in the wings</li>';
  }

  return materials.slice(0, 5).map((item, index) => {
    const badge = item.type === 'video' ? 'Video' : item.projection === 'panorama' ? 'Pano' : 'Image';
    return `<li><span>${index + 1}. ${item.name}</span><strong>${badge}</strong></li>`;
  }).join('') + (materials.length > 5
    ? `<li class="upload-list-more">${materials.length - 5} more items already joined the sphere</li>`
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
  countEl.textContent = `${materials.length} media items / ${shardCount} shards`;
  summaryEl.textContent = getSummary();
  formatEl.textContent = `${getFormatSummary()}${panoramaCount ? ' Files containing pano, panorama, 360, or equirect in the name are auto-routed as panoramas.' : ''}`;
  listEl.innerHTML = getListPreview();

  const tagsEl = document.getElementById('upload-stats');
  if (tagsEl) {
    tagsEl.innerHTML = `
      <span>${imageCount} images</span>
      <span>${videoCount} videos</span>
      <span>${panoramaCount} panoramas</span>
    `;
  }
}

function handleFiles(files) {
  window.SM.modules.upload?.materialRouter?.hydrateFromFiles?.(files);
  dragDepth = 0;
  setDropState(false);
}

function render() {
  const container = document.getElementById('upload-container');
  if (!container || container.dataset.ready === '1') return;

  container.dataset.ready = '1';
  container.innerHTML = `
    <div class="upload-panel">
      <div class="upload-copy">
        <strong>Memory Studio</strong>
        <span id="upload-count"></span>
        <p id="upload-summary"></p>
        <p id="upload-format-summary" class="upload-format-summary"></p>
      </div>
      <div id="upload-stats" class="upload-badges"></div>
      <label id="upload-dropzone" class="upload-picker" for="upload-images" data-drag="0">
        <span>Drop files here or tap to keep adding media</span>
        <small>Supports JPG, PNG, WebP, MP4, and panorama-ready names</small>
        <input id="upload-images" type="file" accept="image/*,video/*" multiple>
      </label>
      <div class="upload-actions">
        <button id="upload-randomize" class="upload-button alt" type="button">Shuffle sphere</button>
        <button id="upload-preset" class="upload-button" type="button">Restore demo set</button>
      </div>
      <ul id="upload-list" class="upload-list"></ul>
    </div>
  `;

  const input = container.querySelector('#upload-images');
  const randomizeButton = container.querySelector('#upload-randomize');
  const presetButton = container.querySelector('#upload-preset');
  const dropzone = container.querySelector('#upload-dropzone');

  fileChangeHandler = (event) => {
    const files = Array.from(event.target.files ?? []);
    handleFiles(files);
    event.target.value = '';
  };

  randomizeHandler = () => {
    window.SM.modules.upload?.materialRouter?.randomizeAssignments?.();
  };

  presetHandler = () => {
    window.SM.modules.upload?.materialRouter?.usePresetMaterials?.();
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
  dropzone?.addEventListener('dragenter', dragEnterHandler);
  dropzone?.addEventListener('dragleave', dragLeaveHandler);
  dropzone?.addEventListener('dragover', dragOverHandler);
  dropzone?.addEventListener('drop', dropHandler);
  renderStatus();
}

function init() {
  render();
  offMaterials = window.SM.bus.on('materials:updated', renderStatus);
  renderStatus();
}

function destroy() {
  const container = document.getElementById('upload-container');
  container?.querySelector('#upload-images')?.removeEventListener('change', fileChangeHandler);
  container?.querySelector('#upload-randomize')?.removeEventListener('click', randomizeHandler);
  container?.querySelector('#upload-preset')?.removeEventListener('click', presetHandler);
  container?.querySelector('#upload-dropzone')?.removeEventListener('dragenter', dragEnterHandler);
  container?.querySelector('#upload-dropzone')?.removeEventListener('dragleave', dragLeaveHandler);
  container?.querySelector('#upload-dropzone')?.removeEventListener('dragover', dragOverHandler);
  container?.querySelector('#upload-dropzone')?.removeEventListener('drop', dropHandler);
  offMaterials?.();
  offMaterials = null;
  fileChangeHandler = null;
  randomizeHandler = null;
  presetHandler = null;
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
