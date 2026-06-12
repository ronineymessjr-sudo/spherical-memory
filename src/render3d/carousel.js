// 3D rotating gallery — a vertical carousel of up to 8 small 3D cards
// (textured plane) that orbit slowly around a vertical axis to the
// right of the sphere. Each card is a 2D plane with the material's
// image, a caption underneath, and mood-tinted border. Camera is
// already pointed at the sphere so the carousel sits in the right
// foreground.

import * as THREE from 'three';

const CARD_COUNT = 8;
const RING_RADIUS = 3.4;
const CARD_WIDTH = 0.86;
const CARD_HEIGHT = 0.62;
const ROTATION_PERIOD = 28000; // ms for full revolution

let group = null;
let cards = []; // { mesh, frameMesh, material, frameMat, caption, basePosition, basePhase }
let frameId = 0;
let offMaterials = null;
let offMood = null;
let mood = 'wistful';

const MOOD_FRAME = {
  vivid: new THREE.Color('#ffb27a'),
  wistful: new THREE.Color('#8fd6ff'),
  healing: new THREE.Color('#7be2c8'),
};

function ensureGroup() {
  if (group) return group;
  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (!root) return null;
  group = new THREE.Group();
  group.name = 'carousel';
  group.position.set(2.6, 0, 0.4);
  group.rotation.set(0, -0.32, 0);
  root.add(group);
  return group;
}

function buildCard(index) {
  const phase = (index / CARD_COUNT) * Math.PI * 2;
  const x = Math.cos(phase) * RING_RADIUS;
  const z = Math.sin(phase) * RING_RADIUS;
  const basePosition = new THREE.Vector3(x, 0, z);
  const baseRotation = new THREE.Euler(0, -phase + Math.PI / 2, 0);

  // Border frame (a slightly larger plane with mood color).
  const frameMat = new THREE.MeshBasicMaterial({
    color: MOOD_FRAME[mood].clone(),
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const frameMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_WIDTH + 0.04, CARD_HEIGHT + 0.06),
    frameMat,
  );
  frameMesh.position.copy(basePosition);
  frameMesh.rotation.copy(baseRotation);
  frameMesh.position.z += -0.005; // sit just behind the card

  // Card itself: textured plane (texture set lazily).
  const cardMat = new THREE.MeshBasicMaterial({
    color: '#222',
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const cardMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT),
    cardMat,
  );
  cardMesh.position.copy(basePosition);
  cardMesh.rotation.copy(baseRotation);
  cardMesh.userData.cardIndex = index;

  group.add(frameMesh, cardMesh);
  return { mesh: cardMesh, frameMesh, material: cardMat, frameMat, basePosition, basePhase: phase };
}

function populate() {
  if (!group) return;
  cards.forEach((c) => {
    c.mesh.geometry.dispose();
    c.material.dispose();
    c.frameMesh.geometry.dispose();
    c.frameMat.dispose();
    group.remove(c.mesh);
    group.remove(c.frameMesh);
  });
  cards = [];
  for (let i = 0; i < CARD_COUNT; i += 1) {
    cards.push(buildCard(i));
  }
}

const textureLoader = new THREE.TextureLoader();
function bindMaterialToCard(card, material) {
  if (!material) return;
  const url = material.url;
  textureLoader.load(url, (tex) => {
    if (card.material.map) card.material.map.dispose();
    tex.colorSpace = THREE.SRGBColorSpace;
    card.material.map = tex;
    card.material.color.set('#ffffff');
    card.material.needsUpdate = true;
  });
}

function updateCards() {
  if (!group || !cards.length) return;
  const materials = window.SM?.materials ?? [];
  // Bind each card to one material (cycled).
  cards.forEach((card, idx) => {
    const m = materials[idx % Math.max(1, materials.length)];
    if (m) bindMaterialToCard(card, m);
  });
}

function tick() {
  frameId = window.requestAnimationFrame(tick);
  if (!group) return;
  // Spin the group slowly around Y.
  group.rotation.y = (performance.now() % ROTATION_PERIOD) / ROTATION_PERIOD * Math.PI * 2;
}

function setMood(name) {
  if (!name || !MOOD_FRAME[name]) return;
  mood = name;
  cards.forEach((c) => c.frameMat.color.copy(MOOD_FRAME[name]));
}

function init() {
  ensureGroup();
  populate();
  if (!frameId) frameId = window.requestAnimationFrame(tick);
  updateCards();
  offMaterials = window.SM.bus.on('materials:updated', updateCards);
  offMood = window.SM.bus.on('mood:change', ({ name }) => setMood(name));
}

function destroy() {
  offMaterials?.();
  offMood?.();
  offMaterials = null;
  offMood = null;
  if (frameId) {
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  }
  cards.forEach((c) => {
    c.mesh.geometry.dispose();
    c.material.map?.dispose?.();
    c.material.dispose();
    c.frameMesh.geometry.dispose();
    c.frameMat.dispose();
    if (c.mesh.parent) c.mesh.parent.remove(c.mesh);
    if (c.frameMesh.parent) c.frameMesh.parent.remove(c.frameMesh);
  });
  cards = [];
  group?.parent?.remove?.(group);
  group = null;
}

export {
  init,
  destroy,
  setMood,
};
