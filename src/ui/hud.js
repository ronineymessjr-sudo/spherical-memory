let screenshotHandler = null;
let resetHandler = null;
let demoHandler = null;
let offFocus = null;
let offBlur = null;
let offState = null;
let offMaterials = null;

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
  const titleEl = document.getElementById('hud-focus-title');
  const metaEl = document.getElementById('hud-focus-meta');
  if (!titleEl || !metaEl) return;

  if (!payload) {
    titleEl.textContent = 'Sphere overview';
    metaEl.textContent = 'Drag to orbit, pinch or wheel to zoom, and tap a shard to spotlight it.';
    return;
  }

  titleEl.textContent = payload.materialName || payload.shardId;
  metaEl.textContent = `${payload.materialType === 'video' ? 'Video shard' : 'Image shard'} - ${payload.projection === 'panorama' ? 'Panorama mapping' : 'Flat mapping'} - ${payload.repeated ? 'Repeated fill' : `Slot ${payload.slotIndex + 1}`}`;
}

function updateLibraryCard() {
  const statsEl = document.getElementById('hud-library-stats');
  const detailEl = document.getElementById('hud-library-detail');
  if (!statsEl || !detailEl) return;

  const stats = getLibraryStats();
  statsEl.textContent = `${stats.total} media items / ${stats.shardCount} shards`;
  detailEl.textContent = `${stats.imageCount} images - ${stats.videoCount} videos - ${stats.panoramaCount} panoramas`;
}

function render() {
  const container = document.getElementById('hud-container');
  if (!container || container.dataset.ready === '1') return;

  container.dataset.ready = '1';
  container.innerHTML = `
    <div class="hud-stack">
      <div class="hud-card hud-focus-card">
        <p class="hud-label">Current Focus</p>
        <strong id="hud-focus-title">Sphere overview</strong>
        <p id="hud-focus-meta">Drag to orbit, pinch or wheel to zoom, and tap a shard to spotlight it.</p>
      </div>
      <div class="hud-card hud-library-card">
        <p class="hud-label">Library Status</p>
        <strong id="hud-library-stats"></strong>
        <p id="hud-library-detail"></p>
      </div>
      <div class="hud-card hud-panel">
        <button id="hud-screenshot" class="hud-button" type="button">Save capture</button>
        <button id="hud-reset" class="hud-button alt" type="button">Reset flow</button>
        <button id="hud-demo" class="hud-button alt" type="button">Auto demo</button>
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

  container.querySelector('#hud-screenshot')?.addEventListener('click', screenshotHandler);
  container.querySelector('#hud-reset')?.addEventListener('click', resetHandler);
  container.querySelector('#hud-demo')?.addEventListener('click', demoHandler);
}

function init() {
  render();
  updateFocusCard();
  updateLibraryCard();
  offFocus = window.SM.bus.on('shard:focus', updateFocusCard);
  offBlur = window.SM.bus.on('shard:blur', () => updateFocusCard());
  offState = window.SM.bus.on('state:change', ({ to }) => {
    if (to !== 'sphere' && to !== 'share') {
      updateFocusCard();
    }
  });
  offMaterials = window.SM.bus.on('materials:updated', updateLibraryCard);
}

function destroy() {
  const container = document.getElementById('hud-container');
  container?.querySelector('#hud-screenshot')?.removeEventListener('click', screenshotHandler);
  container?.querySelector('#hud-reset')?.removeEventListener('click', resetHandler);
  container?.querySelector('#hud-demo')?.removeEventListener('click', demoHandler);
  offFocus?.();
  offBlur?.();
  offState?.();
  offMaterials?.();
  offFocus = null;
  offBlur = null;
  offState = null;
  offMaterials = null;
  screenshotHandler = null;
  resetHandler = null;
  demoHandler = null;
}

export {
  init,
  destroy,
};
