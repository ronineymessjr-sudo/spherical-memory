let overlayEl = null;
let offState = null;

function getOverlay() {
  if (!overlayEl) {
    overlayEl = document.getElementById('mirror-crack-overlay');
  }
  return overlayEl;
}

function applyStage(stage) {
  const overlay = getOverlay();
  if (!overlay) return;
  overlay.dataset.stage = String(stage);
}

function playStage(stage) {
  applyStage(stage);

  if (stage === 3) {
    // Mirror shards fly out first, then a beat later the particles + shards
    // aggregate phase starts.
    window.SM.bus.emit('crack:burst', {});
    window.setTimeout(() => {
      window.SM.bus.emit('crack:explode', {});
    }, 520);
  }
}

function reset() {
  applyStage(0);
}

function init() {
  offState = window.SM.bus.on('state:change', ({ to }) => {
    if (to === 'cracking') {
      playStage(3);
    }
    if (to === 'mirror' || to === 'cover') {
      reset();
    }
  });
}

function destroy() {
  offState?.();
  offState = null;
  overlayEl = null;
}

export {
  init,
  destroy,
  playStage,
  reset,
};
