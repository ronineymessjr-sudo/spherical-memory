const PRESET_MATERIALS = Array.from({ length: 6 }, (_, index) => ({
  id: `preset-${index + 1}`,
  type: 'panorama',
  url: `./assets/fallback/memory-0${index + 1}.svg`,
  isPanorama: true,
}));

function init() {
  if (!window.SM.materials.length) {
    window.SM.materials = PRESET_MATERIALS;
  }
}

function destroy() {}

export {
  init,
  destroy,
};
