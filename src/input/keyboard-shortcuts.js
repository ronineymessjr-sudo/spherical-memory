// Keyboard shortcuts for power users.
//
//   1-5  : switch arrangement (sphere / ring / nebula / whirlpool / timeline)
//   Q/W/E: switch mood       (vivid / wistful / healing)
//   A/S/D/F: switch theme    (glass / aurora / film / metal)
//   R    : toggle 10s recording
//   P    : screenshot
//   G    : reshuffle shards
//   L    : cycle language
//   H    : toggle this help
//   Esc  : close story modal / blur focus
//
// Shortcuts are suppressed when the user is typing in an input/textarea or
// when the help overlay is open.

import { onLanguageChange, t, toggleLang } from '../core/i18n.js';

let offLanguage = null;
let helpEl = null;
let helpVisible = false;
let bound = false;

const ARRANGEMENTS = ['sphere', 'ring', 'nebula', 'whirlpool', 'timeline'];
const MOODS = ['vivid', 'wistful', 'healing'];
const THEMES = ['glass', 'aurora', 'film', 'metal'];

function emit(name, payload) {
  window.SM?.bus?.emit?.(name, payload);
}

function handle(event) {
  if (!event.key) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return;
  }
  const key = event.key.toLowerCase();
  // Esc — close story / blur
  if (event.key === 'Escape') {
    const story = document.querySelector('.shard-story[data-visible="1"]');
    if (story) {
      window.SM.bus.emit('story:close', {});
      story.dataset.visible = '0';
      return;
    }
    if (window.SM?.activeShardId) {
      window.SM.modules.render3d?.panoramaBind?.resetView?.();
      return;
    }
    if (helpVisible) {
      toggleHelp(false);
      event.preventDefault();
    }
    return;
  }
  if (key === 'h' && !helpVisible) {
    toggleHelp(true);
    event.preventDefault();
    return;
  }
  if (key === 'h' && helpVisible) {
    toggleHelp(false);
    event.preventDefault();
    return;
  }
  if (key === 'l') {
    toggleLang();
    event.preventDefault();
    return;
  }
  if (key === 'r') {
    const recorder = window.SM.modules.output?.recorder;
    const recording = recorder?.isRecording?.() ?? !!window.SM.__recording;
    if (recording) {
      window.SM.modules.output?.recorder?.stop?.();
    } else {
      window.SM.modules.output?.recorder?.start?.(10);
    }
    event.preventDefault();
    return;
  }
  if (key === 'p') {
    window.SM.modules.output?.screenshot?.take?.();
    event.preventDefault();
    return;
  }
  if (key === 'g') {
    window.SM.modules.render3d?.shardMesh?.randomizeTopology?.();
    window.SM.modules.upload?.materialRouter?.randomizeAssignments?.();
    event.preventDefault();
    return;
  }
  // Number 1-5 — arrangement
  if (key >= '1' && key <= '5') {
    const idx = parseInt(key, 10) - 1;
    const name = ARRANGEMENTS[idx];
    if (name) {
      emit('arrangement:set', { name });
      if (name === 'timeline') emit('timeline:enable', {}); else emit('timeline:disable', {});
      event.preventDefault();
    }
    return;
  }
  // Q/W/E — mood
  if (key === 'q' || key === 'w' || key === 'e') {
    const idx = 'qwe'.indexOf(key);
    const name = MOODS[idx];
    if (name) {
      emit('mood:set', { name });
      event.preventDefault();
    }
    return;
  }
  // A/S/D/F — theme
  if (key === 'a' || key === 's' || key === 'd' || key === 'f') {
    const idx = 'asdf'.indexOf(key);
    const name = THEMES[idx];
    if (name) {
      emit('theme:set', { name });
      event.preventDefault();
    }
  }
}

function toggleHelp(force) {
  if (!helpEl) return;
  helpVisible = force ?? !helpVisible;
  helpEl.dataset.visible = helpVisible ? '1' : '0';
}

function buildHelp() {
  if (helpEl) return helpEl;
  helpEl = document.createElement('div');
  helpEl.id = 'keyboard-help';
  helpEl.className = 'keyboard-help';
  helpEl.dataset.visible = '0';
  helpEl.innerHTML = `
    <div class="keyboard-help-inner">
      <div class="keyboard-help-header">
        <strong>${t('help.title')}</strong>
        <span>${t('help.hint')}</span>
      </div>
      <div class="keyboard-help-grid">
        <div><kbd>1-5</kbd> ${t('help.arrangement')}</div>
        <div><kbd>Q</kbd><kbd>W</kbd><kbd>E</kbd> ${t('help.mood')}</div>
        <div><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><kbd>F</kbd> ${t('help.theme')}</div>
        <div><kbd>R</kbd> ${t('help.record')}</div>
        <div><kbd>P</kbd> ${t('help.screenshot')}</div>
        <div><kbd>G</kbd> ${t('help.shuffle')}</div>
        <div><kbd>L</kbd> ${t('help.lang')}</div>
        <div><kbd>H</kbd> ${t('help.toggle')}</div>
        <div><kbd>Esc</kbd> ${t('help.escape')}</div>
      </div>
    </div>
  `;
  document.body.appendChild(helpEl);
  return helpEl;
}

function init() {
  if (bound) return;
  buildHelp();
  window.addEventListener('keydown', handle);
  offLanguage = onLanguageChange(() => {
    if (helpEl) helpEl.innerHTML = buildHelp().innerHTML;
  });
  bound = true;
}

function destroy() {
  window.removeEventListener('keydown', handle);
  offLanguage?.();
  offLanguage = null;
  helpEl?.remove();
  helpEl = null;
  helpVisible = false;
  bound = false;
}

export {
  init,
  destroy,
  toggleHelp,
};
