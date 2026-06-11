let offDragStart = null;
let offDrag = null;
let offDragEnd = null;
let offPinch = null;
let offWheel = null;
let inertiaFrame = 0;
let dragging = false;
let velocity = { x: 0, y: 0 };

function stopInertia() {
  if (inertiaFrame) {
    window.cancelAnimationFrame(inertiaFrame);
    inertiaFrame = 0;
  }
}

function startInertia() {
  stopInertia();

  const step = () => {
    velocity.x *= 0.92;
    velocity.y *= 0.92;

    if (Math.abs(velocity.x) < 0.0002 && Math.abs(velocity.y) < 0.0002) {
      velocity = { x: 0, y: 0 };
      inertiaFrame = 0;
      return;
    }

    window.SM.modules.render3d.shardMesh?.rotateBy?.(velocity.x, velocity.y);
    inertiaFrame = window.requestAnimationFrame(step);
  };

  inertiaFrame = window.requestAnimationFrame(step);
}

function dolly(scaleDelta) {
  if (window.SM.currentState !== 'sphere') return;
  window.SM.modules.render3d.scene?.dollyBy?.(scaleDelta);
}

function init() {
  offDragStart = window.SM.bus.on('input:drag-start', ({ target }) => {
    if (window.SM.currentState !== 'sphere') return;
    if (target !== 'sphere') return;
    dragging = true;
    velocity = { x: 0, y: 0 };
    stopInertia();
  });

  offDrag = window.SM.bus.on('input:drag', ({ dx, dy, target }) => {
    if (!dragging) return;
    if (target !== 'sphere') return;

    const nextVelocity = {
      x: dx * 0.0018,
      y: dy * 0.0014,
    };

    velocity = nextVelocity;
    window.SM.modules.render3d.shardMesh?.rotateBy?.(nextVelocity.x, nextVelocity.y);
  });

  offDragEnd = window.SM.bus.on('input:drag-end', ({ target }) => {
    if (!dragging) return;
    if (target !== 'sphere') return;
    dragging = false;
    startInertia();
  });

  offPinch = window.SM.bus.on('input:pinch', ({ target, scaleDelta }) => {
    if (target !== 'sphere') return;
    dolly(scaleDelta);
  });

  offWheel = window.SM.bus.on('input:wheel', ({ target, deltaY }) => {
    if (target !== 'sphere') return;
    const scaleDelta = deltaY > 0 ? 0.94 : 1.06;
    dolly(scaleDelta);
  });
}

function destroy() {
  offDragStart?.();
  offDrag?.();
  offDragEnd?.();
  offPinch?.();
  offWheel?.();
  offDragStart = null;
  offDrag = null;
  offDragEnd = null;
  offPinch = null;
  offWheel = null;
  stopInertia();
}

export {
  init,
  destroy,
};
