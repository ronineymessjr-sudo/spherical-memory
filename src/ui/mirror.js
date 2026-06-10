let offTap = null;
let offState = null;
let tapCount = 0;

function updateMirrorCopy() {
  const countEl = document.getElementById('mirror-hit-count');
  const hintEl = document.getElementById('mirror-hint');
  if (!countEl || !hintEl) return;

  countEl.textContent = `${tapCount} / 3 taps`;
  hintEl.textContent = tapCount >= 3
    ? 'Shattering...'
    : tapCount === 2
      ? 'One more hit to fracture the memory.'
      : 'Tap the mirror three times to unlock the memory sphere.';
}

function resetMirror() {
  tapCount = 0;
  updateMirrorCopy();
  window.SM.modules.anim?.mirrorCrack?.reset?.();
}

function render() {
  const container = document.getElementById('mirror-container');
  if (!container || container.dataset.ready === '1') return;

  container.dataset.ready = '1';
  container.innerHTML = `
    <section class="mirror-screen">
      <div class="mirror-copy">
        <p class="eyebrow">MEMORY MIRROR</p>
        <h2>Tap to fracture the reflection</h2>
        <p id="mirror-hint" class="mirror-hint"></p>
        <p id="mirror-hit-count" class="mirror-count"></p>
      </div>
      <div class="mirror-stage">
        <div class="mirror-frame">
          <div class="mirror-surface">
            <div id="mirror-crack-overlay" class="mirror-crack-overlay"></div>
          </div>
        </div>
      </div>
    </section>
  `;

  updateMirrorCopy();
}

function init() {
  render();

  offTap = window.SM.bus.on('input:tap', ({ target }) => {
    if (window.SM.currentState !== 'mirror') return;
    if (target !== 'mirror') return;

    tapCount = Math.min(tapCount + 1, 3);
    window.SM.modules.anim?.mirrorCrack?.playStage?.(tapCount);
    updateMirrorCopy();

    if (tapCount === 3) {
      window.setTimeout(() => {
        window.SM.go('cracking');
      }, 180);
    }
  });

  offState = window.SM.bus.on('state:change', ({ to }) => {
    if (to === 'mirror' || to === 'cover') {
      resetMirror();
    }
  });
}

function destroy() {
  offTap?.();
  offState?.();
  offTap = null;
  offState = null;
}

export {
  init,
  destroy,
};
