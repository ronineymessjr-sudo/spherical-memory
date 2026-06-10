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
        <h1>Fold travel photos and video into a living memory sphere.</h1>
        <p class="cover-copy">
          Upload any number of images, videos, or panoramas. After the mirror fractures, every file gets redistributed across a rotating sphere of shards you can orbit, zoom, focus, and capture.
        </p>
        <div class="cover-preview-grid">
          <article class="cover-preview-card" style="background-image:linear-gradient(180deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.58)), url('./assets/fallback/travel-media/travel-01-seaside.webp')">
            <span>Seaside dusk</span>
          </article>
          <article class="cover-preview-card" style="background-image:linear-gradient(180deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.58)), url('./assets/fallback/travel-media/travel-04-city-night.webp')">
            <span>City after dark</span>
          </article>
          <article class="cover-preview-card" style="background-image:linear-gradient(180deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.58)), url('./assets/fallback/travel-media/travel-08-island-pier.webp')">
            <span>Island morning</span>
          </article>
        </div>
        <div class="cover-stats">
          <div class="cover-stat">
            <strong>Unlimited uploads</strong>
            <span>Keep adding new media and let shard count grow with the library</span>
          </div>
          <div class="cover-stat">
            <strong>Mixed mapping</strong>
            <span>Flat frames crop by shard while panorama names auto-wrap to the sphere</span>
          </div>
          <div class="cover-stat">
            <strong>Touch-first control</strong>
            <span>Drag, pinch, shuffle, autoplay, and capture are wired end to end</span>
          </div>
        </div>
        <button id="enter-memory-button" class="primary-cta" type="button">Enter the sphere</button>
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
