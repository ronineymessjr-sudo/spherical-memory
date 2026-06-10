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
  badge.textContent = 'Auto demo running';
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
      if (!active || spins > 140) return;
      shardMesh?.rotateBy?.(0.012, Math.sin(spins / 20) * 0.0008);
      spins += 1;
      later(16, spin);
    }

    spin();
  });

  later(9200, () => {
    if (!active) return;
    window.SM.modules.output?.screenshot?.take?.();
  });

  later(10200, () => {
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
