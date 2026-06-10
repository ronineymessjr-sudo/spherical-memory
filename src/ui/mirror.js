let offTap = null;
let offState = null;
let tapCount = 0;

function updateMirrorCopy() {
  const countEl = document.getElementById('mirror-hit-count');
  const hintEl = document.getElementById('mirror-hint');
  const stageEl = document.getElementById('mirror-stage-label');
  const barEl = document.getElementById('mirror-progress-bar');
  const steps = Array.from(document.querySelectorAll('.mirror-step'));
  if (!countEl || !hintEl || !stageEl || !barEl) return;

  countEl.textContent = `${tapCount} / 3 hits`;
  stageEl.textContent = tapCount >= 3 ? 'Phase 03 - Release' : `Phase 0${tapCount + 1} - Charge`;
  barEl.style.setProperty('--progress', `${(tapCount / 3) * 100}%`);
  steps.forEach((step, index) => {
    step.dataset.active = index < tapCount ? '1' : '0';
  });

  hintEl.textContent = tapCount >= 3
    ? 'The mirror is releasing the shard cloud...'
    : tapCount === 2
      ? 'One more hit and the sphere will rebuild itself.'
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
        <h2>Break the reflection and release the travel archive.</h2>
        <p id="mirror-stage-label" class="mirror-stage-label"></p>
        <p id="mirror-hint" class="mirror-hint"></p>
        <div id="mirror-progress-bar" class="mirror-progress-bar"></div>
        <p id="mirror-hit-count" class="mirror-count"></p>
        <div class="mirror-steps">
          <span class="mirror-step" data-active="0">1. Charge</span>
          <span class="mirror-step" data-active="0">2. Fracture</span>
          <span class="mirror-step" data-active="0">3. Aggregate</span>
        </div>
      </div>
      <div class="mirror-stage">
        <div class="mirror-frame">
          <div class="mirror-surface">
            <div class="mirror-reflection"></div>
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
