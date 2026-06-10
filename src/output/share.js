async function share() {
  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Spherical Memory',
        text: 'A reflective memory sphere rebuilt from six fragments.',
      });
      window.SM.bus.emit('share:done', { method: 'native' });
      return true;
    }

    await navigator.clipboard.writeText(window.location.href);
    window.SM.bus.emit('share:done', { method: 'clipboard' });
    return true;
  } catch (error) {
    window.SM.bus.emit('share:error', { error });
    return false;
  }
}

function init() {}

function destroy() {}

export {
  init,
  destroy,
  share,
};
