import { beforeEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { EventBus } from '../src/core/event-bus.js';
import * as materialTheme from '../src/render3d/material-theme.js';

describe('material-theme', () => {
  beforeEach(() => {
    const material = {
      color: new THREE.Color('#ffffff'),
      emissive: new THREE.Color('#000000'),
      transparent: true,
      opacity: 0.96,
      roughness: 0.3,
      metalness: 0.05,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2,
      transmission: 0.2,
      thickness: 0.2,
      ior: 1.3,
      sheen: 0.2,
      emissiveIntensity: 0.1,
      userData: {},
      needsUpdate: false,
    };

    window.SM = {
      bus: new EventBus(),
      modules: {
        render3d: {
          shardMesh: {
            getShards: () => [{ material }],
          },
        },
      },
    };
  });

  it('applies the selected theme when theme:set is emitted', () => {
    materialTheme.init();

    window.SM.bus.emit('theme:set', { name: 'metal' });

    const shard = window.SM.modules.render3d.shardMesh.getShards()[0];
    expect(shard.material.metalness).toBe(0.92);
    expect(shard.material.userData.baseOpacity).toBe(0.98);
    expect(shard.material.userData.baseEmissiveIntensity).toBe(0.2);

    materialTheme.destroy();
  });
});
