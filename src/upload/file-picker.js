let fileChangeHandler = null;
let randomizeHandler = null;
let presetHandler = null;
let offMaterials = null;

function getSummary() {
  const materialCount = window.SM.materials?.length ?? 0;
  const shardCount = window.SM.materialAssignments?.length ?? 0;
  const videoCount = (window.SM.materials ?? []).filter((item) => item.type === 'video').length;
  const noun = videoCount ? 'media items' : 'images';

  if (!materialCount) {
    return 'No media loaded yet. Preset demo fragments will be used.';
  }

  if (materialCount < shardCount) {
    return `${materialCount} uploaded ${noun}, expanded to ${shardCount} shards.`;
  }

  return `${materialCount} uploaded ${noun}, ${shardCount} live shards on the sphere.`;
}

function getFormatSummary() {
  const materials = window.SM.materials ?? [];
  const panoramaCount = materials.filter((item) => item.projection === 'panorama').length;
  const flatCount = materials.filter((item) => item.projection !== 'panorama').length;
  const videoCount = materials.filter((item) => item.type === 'video').length;
  const imageCount = materials.length - videoCount;

  if (!materials.length) {
    return 'Demo set loaded. Replace it with your own images or videos at any time.';
  }

  const mediaSummary = videoCount
    ? `${imageCount} image${imageCount === 1 ? '' : 's'} + ${videoCount} video${videoCount === 1 ? '' : 's'}`
    : `${imageCount} image${imageCount === 1 ? '' : 's'}`;

  if (!panoramaCount) {
    return `${mediaSummary} mapped with flat shard crop distortion.`;
  }

  if (!flatCount) {
    return `${mediaSummary} mapped with sphere-aware panorama distortion.`;
  }

  return `${mediaSummary} split across ${panoramaCount} panorama and ${flatCount} flat mappings.`;
}

function renderStatus() {
  const summaryEl = document.getElementById('upload-summary');
  const countEl = document.getElementById('upload-count');
  const formatEl = document.getElementById('upload-format-summary');
  if (!summaryEl || !countEl || !formatEl) return;

  const materialCount = window.SM.materials?.length ?? 0;
  const shardCount = window.SM.materialAssignments?.length ?? 0;
  countEl.textContent = `${materialCount} images / ${shardCount} shards`;
  summaryEl.textContent = getSummary();
  formatEl.textContent = getFormatSummary();
}

function render() {
  const container = document.getElementById('upload-container');
  if (!container || container.dataset.ready === '1') return;

  container.dataset.ready = '1';
  container.innerHTML = `
    <div class="upload-panel">
      <div class="upload-copy">
        <strong>Memory Inputs</strong>
        <span id="upload-count"></span>
        <p id="upload-summary"></p>
        <p id="upload-format-summary" class="upload-format-summary"></p>
      </div>
      <div class="upload-badges">
        <span>JPG / PNG / WebP / MP4</span>
        <span>Panorama-ready</span>
        <span>Image + video mix</span>
      </div>
      <label class="upload-picker" for="upload-images">
        <span>Upload media</span>
        <input id="upload-images" type="file" accept="image/*,video/*" multiple>
      </label>
      <button id="upload-randomize" class="upload-button alt" type="button">Randomize sphere</button>
      <button id="upload-preset" class="upload-button" type="button">Use demo assets</button>
    </div>
  `;

  const input = container.querySelector('#upload-images');
  const randomizeButton = container.querySelector('#upload-randomize');
  const presetButton = container.querySelector('#upload-preset');

  fileChangeHandler = (event) => {
    const files = Array.from(event.target.files ?? []);
    window.SM.modules.upload?.materialRouter?.hydrateFromFiles?.(files);
    event.target.value = '';
  };

  randomizeHandler = () => {
    window.SM.modules.upload?.materialRouter?.randomizeAssignments?.();
  };

  presetHandler = () => {
    window.SM.modules.upload?.materialRouter?.usePresetMaterials?.();
  };

  input?.addEventListener('change', fileChangeHandler);
  randomizeButton?.addEventListener('click', randomizeHandler);
  presetButton?.addEventListener('click', presetHandler);
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
  offMaterials?.();
  offMaterials = null;
  fileChangeHandler = null;
  randomizeHandler = null;
  presetHandler = null;
}

export {
  init,
  destroy,
};
