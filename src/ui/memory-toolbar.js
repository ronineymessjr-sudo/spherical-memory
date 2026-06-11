// Toolbar with arrangement / mood / theme / record / group / AI title controls.
// Mounted as a sibling of the HUD card. All controls dispatch bus events so
// the renderer modules can react without tightly coupling the UI to rendering.

import { onLanguageChange, t } from '../core/i18n.js';
import { listArrangements } from '../render3d/sphere-arrangements.js';
import { listThemes } from '../render3d/material-theme.js';
import { restoreAllMaterials, useGroupMaterials, listThemePresets, useThemePreset } from '../upload/material-router.js';

let offLanguage = null;
let offTitle = null;
let offRecorderStart = null;
let offRecorderDone = null;
let toolbarEl = null;
let recordButton = null;
let recordingState = false;
let pendingStopHandler = null;

const MOODS = ['vivid', 'wistful', 'healing'];
const DEFAULT_TITLE_PLACEHOLDER = '—';

function build() {
  if (toolbarEl) return toolbarEl;
  toolbarEl = document.createElement('aside');
  toolbarEl.id = 'memory-toolbar';
  toolbarEl.className = 'memory-toolbar';
  toolbarEl.innerHTML = renderHtml();
  document.body.appendChild(toolbarEl);
  bind();
  return toolbarEl;
}

function renderHtml() {
  const arrangements = listArrangements();
  const themes = listThemes();
  return `
    <div class="memory-toolbar-section">
      <span class="memory-toolbar-label">${t('toolbar.arrangement')}</span>
      <div class="memory-toolbar-row" data-row="arrangement">
        ${arrangements.map((name) => `
          <button class="memory-toolbar-pill" data-arrangement="${name}" type="button">
            ${t(`toolbar.arrangement${capitalize(name)}`)}
          </button>
        `).join('')}
      </div>
    </div>
    <div class="memory-toolbar-section">
      <span class="memory-toolbar-label">${t('toolbar.mood')}</span>
      <div class="memory-toolbar-row" data-row="mood">
        ${MOODS.map((mood) => `
          <button class="memory-toolbar-pill" data-mood="${mood}" type="button">
            ${t(`toolbar.mood${capitalize(mood)}`)}
          </button>
        `).join('')}
      </div>
    </div>
    <div class="memory-toolbar-section">
      <span class="memory-toolbar-label">${t('toolbar.theme')}</span>
      <div class="memory-toolbar-row" data-row="theme">
        ${themes.map((theme) => `
          <button class="memory-toolbar-pill" data-theme="${theme}" type="button">
            ${t(`toolbar.theme${capitalize(theme)}`)}
          </button>
        `).join('')}
      </div>
    </div>
    <div class="memory-toolbar-section">
      <span class="memory-toolbar-label">${t('toolbar.group')}</span>
      <div class="memory-toolbar-row" data-row="group">
        <button class="memory-toolbar-pill" data-group="__all__" type="button">
          ${t('toolbar.groupAll')}
        </button>
        <span id="memory-toolbar-groups" class="memory-toolbar-inline"></span>
      </div>
    </div>
    <div class="memory-toolbar-section">
      <span class="memory-toolbar-label">${t('toolbar.presetTheme')}</span>
      <div class="memory-toolbar-row" data-row="preset">
        ${listThemePresets().map((theme) => `
          <button class="memory-toolbar-pill" data-preset="${theme}" type="button">
            ${t(`toolbar.preset${capitalize(theme)}`)}
          </button>
        `).join('')}
      </div>
    </div>
    <div class="memory-toolbar-section">
      <span class="memory-toolbar-label">${t('toolbar.aiTitle')}</span>
      <div class="memory-toolbar-row" data-row="ai">
        <strong id="memory-toolbar-title" class="memory-toolbar-title">${DEFAULT_TITLE_PLACEHOLDER}</strong>
      </div>
    </div>
    <div class="memory-toolbar-section">
      <span class="memory-toolbar-label"> </span>
      <div class="memory-toolbar-row" data-row="actions">
        <button id="memory-toolbar-shuffle" class="memory-toolbar-pill alt" type="button">${t('toolbar.shuffle')}</button>
        <button id="memory-toolbar-record-screen" class="memory-toolbar-pill alt" type="button" data-active="0">${t('toolbar.recordScreen')}</button>
        <button id="memory-toolbar-record" class="memory-toolbar-pill alt" type="button">${t('toolbar.record')}</button>
      </div>
    </div>
  `;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function setActive(row, value) {
  const rowEl = toolbarEl?.querySelector(`[data-row="${row}"]`);
  if (!rowEl) return;
  Array.from(rowEl.querySelectorAll('.memory-toolbar-pill')).forEach((pill) => {
    const key = pill.dataset[row];
    if (!key) return;
    pill.dataset.active = key === value ? '1' : '0';
  });
}

function refreshTitle() {
  const titleEl = document.getElementById('memory-toolbar-title');
  if (titleEl) titleEl.textContent = window.SM.aiTitle || DEFAULT_TITLE_PLACEHOLDER;
}

function refreshGroups() {
  const container = document.getElementById('memory-toolbar-groups');
  if (!container) return;
  const groups = window.SM.aiGroups ?? [];
  container.innerHTML = groups.map((group) => `
    <button class="memory-toolbar-pill" data-group="${group.key}" type="button">${group.label}</button>
  `).join('');
  Array.from(container.querySelectorAll('button')).forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.group;
      if (key && key !== '__all__') {
        useGroupMaterials(key);
        refreshTitle();
        refreshGroups();
        setActive('group', key);
      } else {
        restoreAllMaterials();
        refreshTitle();
        refreshGroups();
        setActive('group', '__all__');
      }
    });
  });
  setActive('group', window.SM.activeGroupKey || '__all__');
}

function bindRecorderStateListeners() {
  offRecorderStart?.();
  offRecorderDone?.();
  offRecorderStart = window.SM.bus.on('recorder:start', () => setRecordingState(true));
  offRecorderDone = window.SM.bus.on('recorder:done', () => setRecordingState(false));
}

function bind() {
  toolbarEl.querySelectorAll('[data-arrangement]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.arrangement;
      window.SM.bus.emit('arrangement:set', { name });
      if (name === 'timeline') {
        window.SM.bus.emit('timeline:enable', {});
      } else {
        window.SM.bus.emit('timeline:disable', {});
      }
      setActive('arrangement', name);
    });
  });

  toolbarEl.querySelectorAll('[data-mood]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.mood;
      window.SM.bus.emit('mood:set', { name });
      setActive('mood', name);
    });
  });

  toolbarEl.querySelectorAll('[data-theme]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.theme;
      window.SM.bus.emit('theme:set', { name });
      setActive('theme', name);
    });
  });

  toolbarEl.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.preset;
      useThemePreset(name);
      refreshTitle();
      refreshGroups();
      setActive('preset', name);
      setActive('group', '__all__');
    });
  });

  toolbarEl.querySelector('#memory-toolbar-shuffle')?.addEventListener('click', () => {
    window.SM.modules.render3d?.shardMesh?.randomizeTopology?.();
    window.SM.modules.upload?.materialRouter?.randomizeAssignments?.();
  });

  recordButton = toolbarEl.querySelector('#memory-toolbar-record');
  recordButton?.addEventListener('click', () => {
    if (recordingState) {
      window.SM.modules.output?.recorder?.stop?.();
    } else {
      const screenMode = toolbarEl.querySelector('#memory-toolbar-record-screen')?.dataset.active === '1';
      window.SM.modules.output?.recorder?.start?.(10, { screen: screenMode });
    }
  });

  const screenToggle = toolbarEl.querySelector('#memory-toolbar-record-screen');
  screenToggle?.addEventListener('click', () => {
    const next = screenToggle.dataset.active === '1' ? '0' : '1';
    screenToggle.dataset.active = next;
  });

  setActive('arrangement', 'sphere');
  setActive('mood', 'wistful');
  setActive('theme', 'glass');
  setActive('preset', 'all');
  refreshTitle();
  refreshGroups();

  offTitle = window.SM.bus.on('materials:updated', () => {
    refreshTitle();
    refreshGroups();
  });
}

function cleanupBindListeners() {
  offTitle?.();
  offRecorderStart?.();
  offRecorderDone?.();
  offTitle = null;
  offRecorderStart = null;
  offRecorderDone = null;
}

function setRecordingState(isRecording) {
  recordingState = !!isRecording;
  if (!recordButton) return;
  recordButton.textContent = recordingState ? t('toolbar.recording') : t('toolbar.record');
  recordButton.dataset.active = recordingState ? '1' : '0';
}

function init() {
  build();
  setRecordingState(false);
  offLanguage = onLanguageChange(() => {
    if (!toolbarEl) return;
    cleanupBindListeners();
    toolbarEl.innerHTML = renderHtml();
    bind();
    bindRecorderStateListeners();
    setRecordingState(recordingState);
  });
  bindRecorderStateListeners();
}

function destroy() {
  offLanguage?.();
  cleanupBindListeners();
  offLanguage = null;
  toolbarEl?.remove();
  toolbarEl = null;
  if (pendingStopHandler) {
    pendingStopHandler();
    pendingStopHandler = null;
  }
}

export {
  init,
  destroy,
  setRecordingState,
};
