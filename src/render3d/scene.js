import * as THREE from 'three';

let renderer = null;
let camera = null;
let scene = null;
let rootGroup = null;
let backdrop = null;
let animationFrame = 0;
let resizeHandler = null;
let cameraDistance = 4.6;
let clock = null;

function createBackdrop() {
  const pointCount = 260;
  const positions = new Float32Array(pointCount * 3);

  for (let index = 0; index < pointCount; index += 1) {
    const radius = 10 + Math.random() * 6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const offset = index * 3;
    positions[offset] = radius * Math.sin(phi) * Math.cos(theta);
    positions[offset + 1] = radius * Math.cos(phi) * 0.6;
    positions[offset + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: '#9edbff',
    size: 0.045,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'memory-backdrop';
  return points;
}

function init() {
  if (scene) return;

  const canvas = document.getElementById('webgl-canvas');
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor('#000000', 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#0d1020', 0.08);

  camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.14, cameraDistance);

  const ambient = new THREE.AmbientLight('#ffffff', 1.1);
  const hemi = new THREE.HemisphereLight('#9edbff', '#0d1020', 1.55);
  const key = new THREE.DirectionalLight('#9fd6ff', 2.4);
  key.position.set(3.4, 2.8, 4.6);
  const rim = new THREE.DirectionalLight('#ffb9de', 1.4);
  rim.position.set(-4.2, -0.8, -3.6);

  rootGroup = new THREE.Group();
  rootGroup.name = 'sphere-root';
  rootGroup.visible = false;

  backdrop = createBackdrop();
  scene.add(ambient, hemi, key, rim, backdrop, rootGroup);
  clock = new THREE.Clock();

  resizeHandler = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };

  window.addEventListener('resize', resizeHandler);

  const loop = () => {
    animationFrame = window.requestAnimationFrame(loop);
    const elapsed = clock.getElapsedTime();

    if (rootGroup) {
      rootGroup.position.y = Math.sin(elapsed * 0.65) * 0.05;
    }
    if (backdrop) {
      backdrop.rotation.y = elapsed * 0.015;
      backdrop.rotation.x = Math.sin(elapsed * 0.12) * 0.08;
    }

    renderer.render(scene, camera);
  };

  loop();
}

function setCameraDistance(nextDistance) {
  if (!camera) return;
  cameraDistance = THREE.MathUtils.clamp(nextDistance, 2.6, 7.8);
  camera.position.z = cameraDistance;
  window.SM.cameraDistance = cameraDistance;
}

function dollyBy(scaleDelta) {
  if (!camera || !scaleDelta || Number.isNaN(scaleDelta)) return;
  setCameraDistance(cameraDistance / scaleDelta);
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

  backdrop?.geometry?.dispose?.();
  backdrop?.material?.dispose?.();
  backdrop?.parent?.remove?.(backdrop);
  backdrop = null;

  renderer?.dispose();
  renderer = null;
  camera = null;
  scene = null;
  rootGroup = null;
  cameraDistance = 4.6;
  clock = null;
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
  setCameraDistance,
  dollyBy,
};
