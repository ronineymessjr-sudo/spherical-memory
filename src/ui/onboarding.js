// First-time onboarding bubbles. Shows 3 tooltips (drag / pinch / double-tap)
// the first time the user enters the sphere state, and only once per browser.
// Subsequent visits are silent.

import { t, onLanguageChange } from '../core/i18n.js';

const STORAGE_KEY = 'sm-onboarded-sphere-v1';
let offLanguage = null;
let offState = null;
let bubbleEl = null;
let hideTimer = 0;

function build() {
  if (bubbleEl) return bubbleEl;
  bubbleEl = document.createElement('div');
  bubbleEl.id = 'onboarding-bubbles';
  bubbleEl.className = 'onboarding-bubbles';
  bubbleEl.innerHTML = `
    <div class="onb-bubble" data-bubble="drag">
      <strong>↔</strong>
      <span>${t('onboarding.drag')}</span>
    </div>
    <div class="onb-bubble" data-bubble="pinch">
      <strong>⇲</strong>
      <span>${t('onboarding.pinch')}</span>
    </div>
    <div class="onb-bubble" data-bubble="double">
      <strong>◎</strong>
      <span>${t('onboarding.double')}</span>
    </div>
  `;
  document.body.appendChild(bubbleEl);
  return bubbleEl;
}

function shouldShow() {
  try { return !window.localStorage.getItem(STORAGE_KEY); } catch { return true; }
}

function markSeen() {
  try { window.localStorage.setItem(STORAGE_KEY, '1'); } catch {}
}

function showBubbles() {
  if (!shouldShow()) return;
  const el = build();
  el.dataset.visible = '1';
  if (hideTimer) window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    el.dataset.visible = '0';
    markSeen();
  }, 3600);
}

function init() {
  offState = window.SM?.bus?.on?.('state:change', ({ to }) => {
    if (to === 'sphere') showBubbles();
  });
  offLanguage = onLanguageChange(() => {
    if (bubbleEl) {
      bubbleEl.innerHTML = build().innerHTML;
    }
  });
}

function destroy() {
  offState?.();
  offLanguage?.();
  offState = null;
  offLanguage = null;
  if (hideTimer) window.clearTimeout(hideTimer);
  hideTimer = 0;
  bubbleEl?.remove();
  bubbleEl = null;
}

export {
  init,
  destroy,
  showBubbles,
};
