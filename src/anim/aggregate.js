let offExplode = null;
let offDone = null;
let running = false;

async function play() {
  if (running) return;
  running = true;

  const shardMesh = window.SM.modules.render3d?.shardMesh;
  if (!shardMesh) {
    running = false;
    return;
  }

  await shardMesh.explode(220);
  await shardMesh.aggregate(1100);
  running = false;
  window.SM.bus.emit('aggregate:done', {});
}

function init() {
  offExplode = window.SM.bus.on('crack:explode', () => {
    play().catch((error) => {
      running = false;
      console.error('[aggregate] animation failed:', error);
    });
  });

  offDone = window.SM.bus.on('aggregate:done', () => {
    window.SM.go('sphere');
  });
}

function destroy() {
  offExplode?.();
  offDone?.();
  offExplode = null;
  offDone = null;
  running = false;
}

export {
  init,
  destroy,
  play,
};
