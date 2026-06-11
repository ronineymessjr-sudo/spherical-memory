import { onLanguageChange, t } from '../core/i18n.js';

let offTap = null;
let offState = null;
let offLanguage = null;
let tapCount = 0;

function updateMirrorCopy() {
  const countEl = document.getElementById('mirror-hit-count');
  const hintEl = document.getElementById('mirror-hint');
  const stageEl = document.getElementById('mirror-stage-label');
  const barEl = document.getElementById('mirror-progress-bar');
  const steps = Array.from(document.querySelectorAll('.mirror-step'));
  if (!countEl || !hintEl || !stageEl || !barEl) return;

  countEl.textContent = t('mirror.count', { count: tapCount });
  stageEl.textContent = tapCount >= 3
    ? t('mirror.phaseRelease')
    : t('mirror.phaseCharge', { phase: tapCount + 1 });
  barEl.style.setProperty('--progress', `${(tapCount / 3) * 100}%`);
  steps.forEach((step, index) => {
    step.dataset.active = index < tapCount ? '1' : '0';
  });

  hintEl.textContent = tapCount >= 3
    ? t('mirror.hintRelease')
    : tapCount === 2
      ? t('mirror.hintAlmost')
      : t('mirror.hintStart');
}

function resetMirror() {
  tapCount = 0;
  updateMirrorCopy();
  window.SM.modules.anim?.mirrorCrack?.reset?.();
}

function render(force = false) {
  const container = document.getElementById('mirror-container');
  if (!container || (!force && container.dataset.ready === '1')) return;

  container.dataset.ready = '1';
  container.innerHTML = `
    <section class="mirror-screen">
      <div class="mirror-copy">
        <p class="eyebrow">MEMORY MIRROR</p>
        <h2>${t('mirror.title')}</h2>
        <p id="mirror-stage-label" class="mirror-stage-label"></p>
        <p id="mirror-hint" class="mirror-hint"></p>
        <div id="mirror-progress-bar" class="mirror-progress-bar"></div>
        <p id="mirror-hit-count" class="mirror-count"></p>
        <div class="mirror-steps">
          <span class="mirror-step" data-active="0">${t('mirror.step1')}</span>
          <span class="mirror-step" data-active="0">${t('mirror.step2')}</span>
          <span class="mirror-step" data-active="0">${t('mirror.step3')}</span>
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
  offLanguage = onLanguageChange(() => {
    render(true);
    updateMirrorCopy();
  });

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
  offLanguage?.();
  offTap = null;
  offState = null;
  offLanguage = null;
}

export {
  init,
  destroy,
};
