let offDragStart = null;
let offDrag = null;
let offDragEnd = null;
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
    velocity.x *= 0.94;
    velocity.y *= 0.94;

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
      x: dx * 0.0028,
      y: dy * 0.0022,
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
}

function destroy() {
  offDragStart?.();
  offDrag?.();
  offDragEnd?.();
  offDragStart = null;
  offDrag = null;
  offDragEnd = null;
  stopInertia();
}

export {
  init,
  destroy,
};
