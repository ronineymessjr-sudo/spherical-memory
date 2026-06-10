function take() {
  try {
    const renderer = window.SM.modules.render3d?.scene?.getRenderer?.();
    const canvas = renderer?.domElement ?? document.getElementById('webgl-canvas');
    const dataUrl = canvas?.toDataURL?.('image/png');

    if (!dataUrl) {
      throw new Error('canvas is not ready');
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `spherical-memory-${Date.now()}.png`;
    link.click();

    window.SM.bus.emit('screenshot:done', { url: dataUrl });
    return dataUrl;
  } catch (error) {
    window.SM.bus.emit('screenshot:error', { error });
    return null;
  }
}

function init() {}

function destroy() {}

export {
  init,
  destroy,
  take,
};
