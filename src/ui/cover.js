let offTap = null;

function render() {
  const container = document.getElementById('cover-container');
  if (!container || container.dataset.ready === '1') return;

  container.dataset.ready = '1';
  container.innerHTML = `
    <section class="cover-screen">
      <div class="cover-glow"></div>
      <div class="cover-card">
        <p class="eyebrow">SPHERICAL MEMORY</p>
        <h1>Break the mirror.<br>Rebuild the memory.</h1>
        <p class="cover-copy">
          Tap into a reflective memory sphere built from six vivid fragments.
        </p>
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
