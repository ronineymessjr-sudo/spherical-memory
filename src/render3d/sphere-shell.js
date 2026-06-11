import * as THREE from 'three';

let shellGroup = null;
let shellMeshes = [];

function disposeShell() {
  shellMeshes.forEach((mesh) => {
    mesh.geometry?.dispose?.();
    mesh.material?.dispose?.();
    mesh.parent?.remove?.(mesh);
  });
  shellMeshes = [];
  shellGroup?.parent?.remove?.(shellGroup);
  shellGroup = null;
}

function ensureShell() {
  if (shellGroup) return shellGroup;

  const root = window.SM?.modules?.render3d?.scene?.getRootGroup?.();
  if (!root) return null;

  shellGroup = new THREE.Group();
  shellGroup.name = 'sphere-shell';

  const glassShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.57, 42, 42),
    new THREE.MeshPhysicalMaterial({
      color: '#9fdfff',
      transparent: true,
      opacity: 0.1,
      roughness: 0.18,
      metalness: 0.08,
      transmission: 0.24,
      thickness: 0.18,
      side: THREE.BackSide,
    }),
  );

  const haloShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.74, 36, 36),
    new THREE.MeshBasicMaterial({
      color: '#8fd6ff',
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
    }),
  );

  const orbitRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.98, 0.018, 18, 180),
    new THREE.MeshBasicMaterial({
      color: '#ffd3ea',
      transparent: true,
      opacity: 0.26,
    }),
  );
  orbitRing.rotation.set(Math.PI / 2.35, 0.2, -0.18);

  const orbitRingB = orbitRing.clone();
  orbitRingB.material = orbitRing.material.clone();
  orbitRingB.material.color.set('#8fd6ff');
  orbitRingB.material.opacity = 0.18;
  orbitRingB.rotation.set(Math.PI / 3.1, -0.45, 0.36);
  orbitRingB.scale.setScalar(0.94);

  shellGroup.add(glassShell, haloShell, orbitRing, orbitRingB);
  root.add(shellGroup);
  shellMeshes = [glassShell, haloShell, orbitRing, orbitRingB];
  return shellGroup;
}

function init() {
  ensureShell();
}

function destroy() {
  disposeShell();
}

function setVisible(visible) {
  // Only toggle the shell group's visibility, NOT the whole rootGroup — the
  // shards / seams / particles live on rootGroup and must keep rendering.
  if (shellGroup) shellGroup.visible = !!visible;
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
