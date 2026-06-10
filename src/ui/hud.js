let screenshotHandler = null;
let resetHandler = null;
let demoHandler = null;

function render() {
  const container = document.getElementById('hud-container');
  if (!container || container.dataset.ready === '1') return;

  container.dataset.ready = '1';
  container.innerHTML = `
    <div class="hud-panel">
      <button id="hud-screenshot" class="hud-button" type="button">Capture</button>
      <button id="hud-reset" class="hud-button" type="button">Reset</button>
      <button id="hud-demo" class="hud-button alt" type="button">Demo</button>
    </div>
  `;

  screenshotHandler = () => {
    window.SM.modules.output?.screenshot?.take?.();
  };

  resetHandler = () => {
    window.SM.modules.demo?.mode?.stop?.();
    window.SM.modules.render3d?.panoramaBind?.resetView?.();
    window.SM.modules.render3d?.shardMesh?.rotateTo?.(0, 0);
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
}

function destroy() {
  const container = document.getElementById('hud-container');
  container?.querySelector('#hud-screenshot')?.removeEventListener('click', screenshotHandler);
  container?.querySelector('#hud-reset')?.removeEventListener('click', resetHandler);
  container?.querySelector('#hud-demo')?.removeEventListener('click', demoHandler);
  screenshotHandler = null;
  resetHandler = null;
  demoHandler = null;
}

export {
  init,
  destroy,
};
