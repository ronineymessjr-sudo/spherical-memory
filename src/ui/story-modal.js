// Full-screen "story" modal shown when a shard is double-tapped on the sphere.
// Reads the active shard's metadata and renders a generous layout: hero image,
// title, location, taken-at, tags, and the AI subtitle for the sphere.

import { onLanguageChange, t } from '../core/i18n.js';

let offOpen = null;
let offLanguage = null;
let offMood = null;
let modalEl = null;
let currentShardId = null;
let activeMood = 'wistful';

function moodAccent(mood) {
  switch (mood) {
    case 'vivid': return 'linear-gradient(160deg, rgba(255, 154, 120, 0.42), rgba(255, 213, 170, 0.18))';
    case 'wistful': return 'linear-gradient(160deg, rgba(143, 214, 255, 0.42), rgba(165, 182, 255, 0.18))';
    case 'healing': return 'linear-gradient(160deg, rgba(123, 226, 200, 0.42), rgba(158, 213, 255, 0.18))';
    default: return 'linear-gradient(160deg, rgba(143, 214, 255, 0.42), rgba(165, 182, 255, 0.18))';
  }
}

function build() {
  if (modalEl) return modalEl;
  modalEl = document.createElement('div');
  modalEl.id = 'shard-story';
  modalEl.className = 'shard-story';
  modalEl.dataset.visible = '0';
  modalEl.innerHTML = `
    <button class="shard-story-close" type="button" aria-label="Close">×</button>
    <div class="shard-story-inner">
      <div class="shard-story-hero"></div>
      <div class="shard-story-body">
        <p class="shard-story-eyebrow"></p>
        <h2 class="shard-story-title"></h2>
        <p class="shard-story-meta"></p>
        <p class="shard-story-caption"></p>
        <p class="shard-story-location"></p>
        <p class="shard-story-tags"></p>
      </div>
    </div>
  `;
  document.body.appendChild(modalEl);
  modalEl.querySelector('.shard-story-close').addEventListener('click', close);
  modalEl.addEventListener('click', (event) => {
    if (event.target === modalEl) close();
  });
  return modalEl;
}

function open(shardId) {
  const shards = window.SM?.modules?.render3d?.shardMesh?.getShards?.() ?? [];
  const shard = shards.find((s) => s.id === shardId);
  if (!shard) return;
  const data = shard.mesh.userData;
  const modal = build();
  modal.querySelector('.shard-story-eyebrow').textContent = t('card.eyebrow');
  modal.querySelector('.shard-story-title').textContent = data.materialName || shardId;
  modal.querySelector('.shard-story-meta').textContent = t('card.meta', {
    type: data.materialType === 'video' ? t('card.typeVideo') : t('card.typeImage'),
    date: data.takenAt || t('card.noDate'),
  });
  modal.querySelector('.shard-story-caption').textContent = data.caption || t('card.defaultCaption');
  modal.querySelector('.shard-story-location').textContent = data.location ? `📍 ${data.location}` : '';

  const tags = data.tags ?? [];
  modal.querySelector('.shard-story-tags').textContent = tags.map((tag) => `#${tag}`).join(' ');

  const hero = modal.querySelector('.shard-story-hero');
  if (data.materialType === 'video' && shard.material?.map?.image) {
    // Use a 2D snapshot for video by rendering the current video frame into an
    // Image element. We rely on the underlying HTMLVideoElement exposed by
    // panorama-bind. We pull it from window.SM if cached.
    hero.innerHTML = '';
    const img = document.createElement('img');
    img.src = data.materialUrl; // placeholder; we replace below if cache available
    img.alt = data.materialName || shardId;
    hero.appendChild(img);
  } else {
    hero.innerHTML = '';
    const img = document.createElement('img');
    img.src = data.materialUrl || '';
    img.alt = data.materialName || shardId;
    hero.appendChild(img);
  }

  modal.style.background = moodAccent(activeMood);
  modal.dataset.visible = '1';
  currentShardId = shardId;
  window.SM.bus.emit('story:open', { shardId });
}

function close() {
  if (!modalEl) return;
  modalEl.dataset.visible = '0';
  if (currentShardId) {
    window.SM.bus.emit('story:close', { shardId: currentShardId });
  }
  currentShardId = null;
}

function init() {
  build();
  offOpen = window.SM.bus.on('shard:story-open', ({ shardId }) => {
    if (shardId) open(shardId);
  });
  offLanguage = onLanguageChange(() => {
    if (currentShardId) open(currentShardId);
  });
  offMood = window.SM.bus.on('mood:change', ({ name }) => {
    if (name) {
      activeMood = name;
      if (modalEl) modalEl.style.background = moodAccent(name);
    }
  });
}

function destroy() {
  offOpen?.();
  offLanguage?.();
  offMood?.();
  offOpen = null;
  offLanguage = null;
  offMood = null;
  modalEl?.remove();
  modalEl = null;
  currentShardId = null;
}

export {
  init,
  destroy,
};
