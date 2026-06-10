import * as THREE from 'three';

let renderer = null;
let camera = null;
let scene = null;
let rootGroup = null;
let animationFrame = 0;
let resizeHandler = null;

function init() {
  if (scene) return;

  const canvas = document.getElementById('webgl-canvas');
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#120f24');
  scene.fog = new THREE.Fog('#120f24', 4, 12);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 4.6);

  const ambient = new THREE.AmbientLight('#ffffff', 1.6);
  const key = new THREE.DirectionalLight('#89d5ff', 2.2);
  key.position.set(2, 3, 4);
  const rim = new THREE.DirectionalLight('#ff9ad7', 1.4);
  rim.position.set(-3, -1, -4);

  rootGroup = new THREE.Group();
  rootGroup.name = 'sphere-root';
  rootGroup.visible = false;

  scene.add(ambient, key, rim, rootGroup);

  resizeHandler = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };

  window.addEventListener('resize', resizeHandler);

  const loop = () => {
    animationFrame = window.requestAnimationFrame(loop);
    renderer.render(scene, camera);
  };

  loop();
}

function destroy() {
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }

  if (rootGroup) {
    while (rootGroup.children.length) {
      rootGroup.remove(rootGroup.children[0]);
    }
  }

  renderer?.dispose();
  renderer = null;
  camera = null;
  scene = null;
  rootGroup = null;
}

function getRenderer() {
  return renderer;
}

function getCamera() {
  return camera;
}

function getScene() {
  return scene;
}

function getRootGroup() {
  return rootGroup;
}

function setQuality(level) {
  if (!renderer) return;
  renderer.setPixelRatio(level === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 2));
}

function onResize() {
  resizeHandler?.();
}

export {
  init,
  destroy,
  getRenderer,
  getCamera,
  getScene,
  getRootGroup,
  setQuality,
  onResize,
};
