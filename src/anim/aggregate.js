// Aggregate phase choreography.
//
// Goal: particles and shards coexist for the late half of the imprint, so the
// user actually sees shards crystallize out of the cloud (not a hard cut from
// particles to shards).
//
// Timeline:
//   t=0     crack:explode fires -> particles start vaporize (handled by ion-particles)
//   t~0.30  particle phase switches to imprint (clouds now target shard surfaces)
//   t~0.30  shard opacity starts climbing from ~0.18 toward 1.0 over 1.3s
//   t~0.85  particles begin dissolving; shards hit full opacity
//   t=1     aggregate:done -> state machine moves to sphere

let offExplode = null;
let offDone = null;
let running = false;

const REVEAL_TOTAL = 1320; // ms
const REVEAL_START = 0.30; // fraction of imprint phase during which shards start fading in
const REVEAL_END = 0.92;
const FALLBACK_TRANSITION = 420;

function animateShardReveal() {
  const shardMesh = window.SM.modules.render3d?.shardMesh;
  if (!shardMesh) return Promise.resolve();

  const startedAt = performance.now();

  return new Promise((resolve) => {
    function tick(now) {
      const elapsed = now - startedAt;
      const progress = Math.min(elapsed / REVEAL_TOTAL, 1);
      // Normalize to 0..1 across the reveal window.
      const local = clamp01((progress - REVEAL_START) / (REVEAL_END - REVEAL_START));
      const eased = local < 0.5
        ? 0.04 + local * 0.42
        : 0.25 + (1 - Math.pow(1 - (local - 0.5) / 0.5, 3)) * 0.75;

      shardMesh.setOpacityScale?.(Math.max(0.18, eased));

      if (progress < 1) {
        window.requestAnimationFrame(tick);
      } else {
        shardMesh.setOpacityScale?.(1);
        resolve();
      }
    }

    window.requestAnimationFrame(tick);
  });
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function play() {
  if (running) return;
  running = true;

  const shardMesh = window.SM.modules.render3d?.shardMesh;
  try {
    if (!shardMesh || window.SM.renderMode === '2d') {
      await wait(FALLBACK_TRANSITION);
      window.SM.bus.emit('aggregate:done', { fallback: true });
      return;
    }

    // Hold shards barely visible during the vaporize phase.
    shardMesh.setOpacityScale?.(0.18);
    // Quick outward pop.
    await shardMesh.explode(280);
    // Tell ion-particles to start homing in (imprint).
    window.SM.bus.emit('aggregate:fuse-start', {});
    // Run aggregation motion + opacity reveal in parallel so particles still float
    // around them while they snap into place.
    await Promise.all([
      shardMesh.aggregate(1320),
      animateShardReveal(),
    ]);

    window.SM.bus.emit('aggregate:done', {});
  } catch (error) {
    console.warn('[aggregate] falling back to sphere transition:', error);
    await wait(FALLBACK_TRANSITION);
    window.SM.bus.emit('aggregate:done', { fallback: true });
  } finally {
    running = false;
  }
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
