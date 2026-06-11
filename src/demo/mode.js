import { t } from '../core/i18n.js';

let timers = [];
let active = false;

function later(delay, callback) {
  const id = window.setTimeout(callback, delay);
  timers.push(id);
  return id;
}

function clearTimers() {
  timers.forEach((id) => window.clearTimeout(id));
  timers = [];
}

function stop() {
  active = false;
  clearTimers();
  const badge = document.getElementById('demo-badge');
  badge?.remove();
  window.SM.bus.emit('demo:stop', {});
}

function showBadge() {
  if (document.getElementById('demo-badge')) return;
  const badge = document.createElement('div');
  badge.id = 'demo-badge';
  badge.className = 'demo-badge';
  badge.textContent = t('demo.badge');
  document.body.appendChild(badge);
}

function start() {
  stop();
  active = true;
  showBadge();
  window.SM.bus.emit('demo:start', {});

  if (window.SM.currentState !== 'cover') {
    window.SM.modules.render3d?.panoramaBind?.resetView?.();
    window.SM.modules.render3d?.shardMesh?.rotateTo?.(0, 0);
    window.SM.go('cover');
  }

  later(700, () => {
    if (!active) return;
    window.SM.go('mirror');
  });

  later(1600, () => {
    if (!active) return;
    window.SM.bus.emit('input:tap', { target: 'mirror', x: window.innerWidth / 2, y: window.innerHeight / 2 });
  });

  later(2350, () => {
    if (!active) return;
    window.SM.bus.emit('input:tap', { target: 'mirror', x: window.innerWidth / 2, y: window.innerHeight / 2 });
  });

  later(3100, () => {
    if (!active) return;
    window.SM.bus.emit('input:tap', { target: 'mirror', x: window.innerWidth / 2, y: window.innerHeight / 2 });
  });

  later(6000, () => {
    if (!active) return;
    const shardMesh = window.SM.modules.render3d?.shardMesh;
    let spins = 0;

    function spin() {
      if (!active || spins > 120) return;
      // Halved from 0.0052 to 0.0026 — feels more "装置艺术", less "游戏特效".
      shardMesh?.rotateBy?.(0.0026, Math.sin(spins / 28) * 0.00018);
      spins += 1;
      later(28, spin);
    }

    spin();
  });

  later(9500, () => {
    if (!active) return;
    window.SM.modules.output?.screenshot?.take?.();
  });

  later(10600, () => {
    stop();
  });
}

function init() {}

function destroy() {
  stop();
}

export {
  init,
  destroy,
  start,
  stop,
};
