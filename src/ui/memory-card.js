// Memory card popover — shown on top of the sphere when a shard is focused.
// Pure DOM. Hides itself on shard:blur or when state changes away from sphere/share.

import { onLanguageChange, t } from '../core/i18n.js';

let offFocus = null;
let offBlur = null;
let offState = null;
let offLanguage = null;
let cardEl = null;
let currentPayload = null;

function buildCard() {
  if (cardEl) return cardEl;
  cardEl = document.createElement('div');
  cardEl.id = 'memory-card';
  cardEl.className = 'memory-card';
  cardEl.dataset.visible = '0';
  cardEl.innerHTML = `
    <div class="memory-card-inner">
      <p class="memory-card-eyebrow">${t('card.eyebrow')}</p>
      <h3 class="memory-card-title"></h3>
      <p class="memory-card-meta"></p>
      <p class="memory-card-caption"></p>
      <p class="memory-card-location"></p>
      <p class="memory-card-tags"></p>
    </div>
  `;
  document.body.appendChild(cardEl);
  return cardEl;
}

function renderCard(payload) {
  if (!payload) return;
  const card = buildCard();
  const titleEl = card.querySelector('.memory-card-title');
  const metaEl = card.querySelector('.memory-card-meta');
  const captionEl = card.querySelector('.memory-card-caption');
  const locationEl = card.querySelector('.memory-card-location');
  const tagsEl = card.querySelector('.memory-card-tags');

  titleEl.textContent = payload.materialName || payload.shardId;
  metaEl.textContent = t('card.meta', {
    type: payload.materialType === 'video' ? t('card.typeVideo') : t('card.typeImage'),
    date: payload.takenAt || t('card.noDate'),
  });
  captionEl.textContent = payload.caption || t('card.defaultCaption');
  locationEl.textContent = payload.location ? `📍 ${payload.location}` : '';
  tagsEl.textContent = (payload.tags || []).map((tag) => `#${tag}`).join(' ');
  card.dataset.visible = '1';
}

function hideCard() {
  if (cardEl) cardEl.dataset.visible = '0';
}

function init() {
  buildCard();
  offFocus = window.SM.bus.on('shard:focus', (payload) => {
    currentPayload = payload;
    renderCard(payload);
  });
  offBlur = window.SM.bus.on('shard:blur', () => {
    currentPayload = null;
    hideCard();
  });
  offState = window.SM.bus.on('state:change', ({ to }) => {
    if (to !== 'sphere' && to !== 'share') hideCard();
  });
  offLanguage = onLanguageChange(() => {
    if (currentPayload) renderCard(currentPayload);
  });
}

function destroy() {
  offFocus?.();
  offBlur?.();
  offState?.();
  offLanguage?.();
  offFocus = null;
  offBlur = null;
  offState = null;
  offLanguage = null;
  cardEl?.remove();
  cardEl = null;
  currentPayload = null;
}

export {
  init,
  destroy,
};
