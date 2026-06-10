let screenshotHandler = null;
let resetHandler = null;
let demoHandler = null;
let offFocus = null;
let offBlur = null;
let offState = null;

function updateFocusCard(payload = null) {
  const titleEl = document.getElementById('hud-focus-title');
  const metaEl = document.getElementById('hud-focus-meta');
  if (!titleEl || !metaEl) return;

  if (!payload) {
    titleEl.textContent = 'Sphere overview';
    metaEl.textContent = 'Drag to orbit. Pinch or wheel to zoom. Tap a shard to spotlight it.';
    return;
  }

  titleEl.textContent = payload.materialName || payload.shardId;
  metaEl.textContent = `${payload.materialType} · ${payload.projection} projection · ${payload.distortionProfile}`;
}

function render() {
  const container = document.getElementById('hud-container');
  if (!container || container.dataset.ready === '1') return;

  container.dataset.ready = '1';
  container.innerHTML = `
    <div class="hud-stack">
      <div class="hud-card hud-focus-card">
        <p class="hud-label">Sphere control</p>
        <strong id="hud-focus-title">Sphere overview</strong>
        <p id="hud-focus-meta">Drag to orbit. Pinch or wheel to zoom. Tap a shard to spotlight it.</p>
      </div>
      <div class="hud-card hud-panel">
        <button id="hud-screenshot" class="hud-button" type="button">Capture</button>
        <button id="hud-reset" class="hud-button" type="button">Reset</button>
        <button id="hud-demo" class="hud-button alt" type="button">Demo</button>
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
  offFocus = window.SM.bus.on('shard:focus', updateFocusCard);
  offBlur = window.SM.bus.on('shard:blur', () => updateFocusCard());
  offState = window.SM.bus.on('state:change', ({ to }) => {
    if (to !== 'sphere' && to !== 'share') {
      updateFocusCard();
    }
  });
}

function destroy() {
  const container = document.getElementById('hud-container');
  container?.querySelector('#hud-screenshot')?.removeEventListener('click', screenshotHandler);
  container?.querySelector('#hud-reset')?.removeEventListener('click', resetHandler);
  container?.querySelector('#hud-demo')?.removeEventListener('click', demoHandler);
  offFocus?.();
  offBlur?.();
  offState?.();
  offFocus = null;
  offBlur = null;
  offState = null;
  screenshotHandler = null;
  resetHandler = null;
  demoHandler = null;
}

export {
  init,
  destroy,
};
