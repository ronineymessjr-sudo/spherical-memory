let offTap = null;

function render() {
  const container = document.getElementById('cover-container');
  if (!container || container.dataset.ready === '1') return;

  container.dataset.ready = '1';
  container.innerHTML = `
    <section class="cover-screen">
      <div class="cover-orbit orbit-a"></div>
      <div class="cover-orbit orbit-b"></div>
      <div class="cover-glow"></div>
      <div class="cover-card">
        <p class="eyebrow">SPHERICAL MEMORY</p>
        <h1>Turn uploads into a<br>living memory sphere.</h1>
        <p class="cover-copy">
          Upload any number of images, fracture the mirror, and rebuild them into a rotating archive of shards that can be explored, focused, and captured.
        </p>
        <div class="cover-stats">
          <div class="cover-stat">
            <strong>Flexible inputs</strong>
            <span>PNG, JPG, WebP, MP4, panorama-ready</span>
          </div>
          <div class="cover-stat">
            <strong>Dynamic shards</strong>
            <span>Uploads decide the fragment count</span>
          </div>
          <div class="cover-stat">
            <strong>Touch-first</strong>
            <span>Drag, pinch, randomize, capture</span>
          </div>
        </div>
        <button id="enter-memory-button" class="primary-cta" type="button">Tap to enter</button>
      </div>
    </section>
  `;

  container.querySelector('#enter-memory-button')?.addEventListener('click', () => {
    window.SM.go('mirror');
  });
}

function init() {
  render();

  offTap = window.SM.bus.on('input:tap', ({ target }) => {
    if (window.SM.currentState !== 'cover') return;
    if (target !== 'cover') return;
    window.SM.go('mirror');
  });
}

function destroy() {
  offTap?.();
  offTap = null;
}

export {
  init,
  destroy,
};
