function init() {}

function destroy() {}

function setVisible(visible) {
  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (root) root.visible = visible;
}

function setScale(scale) {
  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (root) root.scale.setScalar(scale);
}

export {
  init,
  destroy,
  setVisible,
  setScale,
};
